import React, { useState, useMemo, useCallback, useEffect } from 'react';
import MoltBotChat from '../../components/MoltBotChat';
import { AUTUSRuntime } from '../../core/AUTUSRuntime';
import AUTUSNav from '../../components/AUTUSNav';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS - 생산자 앱 생산기 v2.0
 *
 * 4대 핵심 기능:
 * 1. 비주얼 워크플로우 빌더 - 역할 기반 이벤트 흐름 설계
 * 2. 대시보드 차트 - 실시간 통계 시각화
 * 3. 통합(Integrations) 패널 - 외부 서비스 연동
 * 4. 알림 시스템 - 정교한 알림 설정
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 역할 정의 템플릿
// ═══════════════════════════════════════════════════════════════════════════════

const ROLE_TEMPLATES = {
  owner: {
    id: 'owner',
    name: '대표',
    icon: '👔',
    level: 0,
    responsibilities: ['최종 결정', '전략 수립', '자원 배분'],
    authorities: ['승인', 'Kill', '역할 지정', '정책 확정'],
    canApprove: true,
    canKill: true,
    canAssign: true,
    color: '#F97316',
  },
  manager: {
    id: 'manager',
    name: '관리자',
    icon: '💼',
    level: 1,
    responsibilities: ['운영 관리', '품질 관리', '보고'],
    authorities: ['업무 할당', '일정 조정', '모니터링'],
    canApprove: false,
    canKill: false,
    canAssign: true,
    color: '#3B82F6',
  },
  producer: {
    id: 'producer',
    name: '생산자',
    icon: '🔧',
    level: 2,
    responsibilities: ['생산 실행', '품질 유지', '기록'],
    authorities: ['이벤트 기록', '상태 보고'],
    canApprove: false,
    canKill: false,
    canAssign: false,
    color: '#10B981',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 이벤트 상태 (4단계)
// ═══════════════════════════════════════════════════════════════════════════════

const EVENT_STAGES = {
  UNIFIED: { id: 'UNIFIED', name: '일체화', icon: '📥', color: '#6B7280', desc: '이벤트 수집/통합' },
  AUTOMATED: { id: 'AUTOMATED', name: '자동화', icon: '⚙️', color: '#3B82F6', desc: '규칙 기반 처리' },
  APPROVED: { id: 'APPROVED', name: '승인화', icon: '✅', color: '#F59E0B', desc: '권한자 승인' },
  TASKED: { id: 'TASKED', name: '업무화', icon: '📋', color: '#10B981', desc: '실행 가능 업무' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 통합 서비스 목록
// ═══════════════════════════════════════════════════════════════════════════════

const INTEGRATIONS = {
  slack: { id: 'slack', name: 'Slack', icon: '💬', color: '#4A154B', desc: '팀 채널 알림' },
  googleDrive: { id: 'googleDrive', name: 'Google Drive', icon: '📁', color: '#4285F4', desc: '문서 자동 저장' },
  notion: { id: 'notion', name: 'Notion', icon: '📝', color: '#000000', desc: '데이터베이스 동기화' },
  calendar: { id: 'calendar', name: 'Calendar', icon: '📅', color: '#DB4437', desc: '일정 자동 등록' },
  email: { id: 'email', name: 'Email', icon: '✉️', color: '#EA4335', desc: '이메일 알림' },
  webhook: { id: 'webhook', name: 'Webhook', icon: '🔗', color: '#6B7280', desc: '커스텀 API 연동' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 알림 유형
// ═══════════════════════════════════════════════════════════════════════════════

const NOTIFICATION_TYPES = {
  event_created: { id: 'event_created', name: '이벤트 생성', icon: '📥', defaultEnabled: true },
  stage_changed: { id: 'stage_changed', name: '단계 변경', icon: '🔄', defaultEnabled: true },
  approval_needed: { id: 'approval_needed', name: '승인 필요', icon: '✅', defaultEnabled: true },
  task_assigned: { id: 'task_assigned', name: '업무 할당', icon: '📋', defaultEnabled: true },
  deadline_approaching: { id: 'deadline_approaching', name: '마감 임박', icon: '⏰', defaultEnabled: true },
  v_threshold: { id: 'v_threshold', name: 'V 임계치 도달', icon: '📊', defaultEnabled: false },
};

// ═══════════════════════════════════════════════════════════════════════════════
// V 예측 공식
// ═══════════════════════════════════════════════════════════════════════════════

const predictV = (event, roles, automationRate) => {
  const baseValue = event.value || 10000;
  const roleMultiplier = roles.length > 0 ? 1 + (roles.length * 0.1) : 1;
  const autoMultiplier = 1 + automationRate;
  const timeMultiplier = event.stage === 'TASKED' ? 1.2 : 1;

  return {
    base: baseValue,
    predicted: Math.round(baseValue * roleMultiplier * autoMultiplier * timeMultiplier),
    factors: { roleMultiplier, autoMultiplier, timeMultiplier },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 기본 업무 프로세스 (최초 버전 세팅)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ROLES = [
  { ...ROLE_TEMPLATES.owner },
  { ...ROLE_TEMPLATES.manager },
  { ...ROLE_TEMPLATES.producer },
];

const DEFAULT_MEMBERS = [
  { id: 'M_001', name: '대표자', roleId: 'owner', createdAt: Date.now() },
  { id: 'M_002', name: '운영팀장', roleId: 'manager', createdAt: Date.now() },
  { id: 'M_003', name: '생산자A', roleId: 'producer', createdAt: Date.now() },
];

const DEFAULT_AUTOMATION_RULES = [
  { id: 'R_001', trigger: '이벤트 생성됨', action: '알림 발송', condition: '', active: true },
  { id: 'R_002', trigger: '승인 완료', action: '업무 생성', condition: '', active: true },
  { id: 'R_003', trigger: '기간 경과', action: '자동 승격', condition: '24h', active: true },
];

const DEFAULT_EVENTS = [
  {
    id: 'E_001', type: '신규 주문', data: { value: 50000 }, creatorRoleId: 'producer',
    stage: 'TASKED', value: 50000, createdAt: Date.now() - 86400000,
    history: [
      { stage: 'UNIFIED', at: Date.now() - 86400000 },
      { stage: 'AUTOMATED', at: Date.now() - 72000000 },
      { stage: 'APPROVED', at: Date.now() - 43200000 },
      { stage: 'TASKED', at: Date.now() - 3600000 },
    ],
  },
  {
    id: 'E_002', type: '품질 검수', data: { value: 30000 }, creatorRoleId: 'manager',
    stage: 'APPROVED', value: 30000, createdAt: Date.now() - 43200000,
    history: [
      { stage: 'UNIFIED', at: Date.now() - 43200000 },
      { stage: 'AUTOMATED', at: Date.now() - 36000000 },
      { stage: 'APPROVED', at: Date.now() - 7200000 },
    ],
  },
  {
    id: 'E_003', type: '재고 보충', data: { value: 20000 }, creatorRoleId: 'producer',
    stage: 'AUTOMATED', value: 20000, createdAt: Date.now() - 7200000,
    history: [
      { stage: 'UNIFIED', at: Date.now() - 7200000 },
      { stage: 'AUTOMATED', at: Date.now() - 3600000 },
    ],
  },
  {
    id: 'E_004', type: '고객 문의', data: { value: 15000 }, creatorRoleId: 'producer',
    stage: 'UNIFIED', value: 15000, createdAt: Date.now() - 1800000,
    history: [{ stage: 'UNIFIED', at: Date.now() - 1800000 }],
  },
];

const DEFAULT_INTEGRATIONS = {
  slack: { enabled: true, config: { channel: '#operations' } },
  email: { enabled: true, config: { recipients: ['team@company.com'] } },
  calendar: { enabled: false, config: {} },
  notion: { enabled: false, config: {} },
  googleDrive: { enabled: false, config: {} },
  webhook: { enabled: false, config: {} },
};

const DEFAULT_NOTIFICATIONS = {
  event_created: true,
  stage_changed: true,
  approval_needed: true,
  task_assigned: true,
  deadline_approaching: true,
  v_threshold: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 워크플로우 노드 타입
// ═══════════════════════════════════════════════════════════════════════════════

const WORKFLOW_NODE_TYPES = {
  START: { type: 'START', name: '시작', icon: '▶️', color: '#10B981' },
  ROLE: { type: 'ROLE', name: '역할', icon: '👤', color: '#3B82F6' },
  STAGE: { type: 'STAGE', name: '단계', icon: '📦', color: '#F59E0B' },
  CONDITION: { type: 'CONDITION', name: '조건', icon: '❓', color: '#8B5CF6' },
  ACTION: { type: 'ACTION', name: '액션', icon: '⚡', color: '#EF4444' },
  END: { type: 'END', name: '완료', icon: '🏁', color: '#6B7280' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AUTUSProducer() {
  // 런타임 연결 상태
  const [isRuntimeConnected, setIsRuntimeConnected] = useState(false);

  // 런타임 연결
  useEffect(() => {
    const connectRuntime = async () => {
      if (!AUTUSRuntime.isRunning) {
        await AUTUSRuntime.init({
          appName: '올댓바스켓',
          industry: 'education',
          vTarget: { monthly: 10000000, margin: 0.3 },
        });
      }
      setIsRuntimeConnected(AUTUSRuntime.isRunning);
    };
    connectRuntime();
  }, []);

  // 앱 설정 - 기본값 세팅
  const [appName, setAppName] = useState('올댓바스켓');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, workflow, integrations, notifications

  // 역할 구성 - 기본 역할 세팅
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [members, setMembers] = useState(DEFAULT_MEMBERS);

  // 이벤트 - 기본 프로세스 세팅
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [automationRules, setAutomationRules] = useState(DEFAULT_AUTOMATION_RULES);

  // 통합 설정
  const [integrations, setIntegrations] = useState(DEFAULT_INTEGRATIONS);

  // 알림 설정
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  // 워크플로우 빌더 상태
  const [workflowNodes, setWorkflowNodes] = useState([
    { id: 'start', type: 'START', x: 50, y: 150, label: '시작' },
    { id: 'producer', type: 'ROLE', x: 200, y: 150, label: '생산자', roleId: 'producer' },
    { id: 'unified', type: 'STAGE', x: 350, y: 100, label: '일체화', stageId: 'UNIFIED' },
    { id: 'automated', type: 'STAGE', x: 350, y: 200, label: '자동화', stageId: 'AUTOMATED' },
    { id: 'manager', type: 'ROLE', x: 500, y: 150, label: '관리자', roleId: 'manager' },
    { id: 'approved', type: 'STAGE', x: 650, y: 150, label: '승인화', stageId: 'APPROVED' },
    { id: 'owner', type: 'ROLE', x: 800, y: 100, label: '대표', roleId: 'owner' },
    { id: 'tasked', type: 'STAGE', x: 800, y: 200, label: '업무화', stageId: 'TASKED' },
    { id: 'end', type: 'END', x: 950, y: 150, label: '완료' },
  ]);

  const [workflowConnections, setWorkflowConnections] = useState([
    { from: 'start', to: 'producer' },
    { from: 'producer', to: 'unified' },
    { from: 'producer', to: 'automated' },
    { from: 'unified', to: 'manager' },
    { from: 'automated', to: 'manager' },
    { from: 'manager', to: 'approved' },
    { from: 'approved', to: 'owner' },
    { from: 'approved', to: 'tasked' },
    { from: 'owner', to: 'tasked' },
    { from: 'tasked', to: 'end' },
  ]);

  // 이벤트 생성
  const createEvent = (type, data, creatorRoleId) => {
    const event = {
      id: `E_${Date.now()}`,
      type,
      data,
      creatorRoleId,
      stage: 'UNIFIED',
      value: data.value || 10000,
      createdAt: Date.now(),
      history: [{ stage: 'UNIFIED', at: Date.now() }],
    };
    setEvents([event, ...events]);
    return event;
  };

  // 이벤트 단계 진행
  const advanceEvent = (eventId, newStage, approverRoleId = null) => {
    setEvents(events.map(e => {
      if (e.id !== eventId) return e;
      return {
        ...e,
        stage: newStage,
        approverRoleId: approverRoleId || e.approverRoleId,
        history: [...e.history, { stage: newStage, at: Date.now(), by: approverRoleId }],
      };
    }));
  };

  // 통계
  const stats = useMemo(() => {
    const byStage = Object.keys(EVENT_STAGES).reduce((acc, stage) => {
      acc[stage] = events.filter(e => e.stage === stage).length;
      return acc;
    }, {});

    const totalV = events
      .filter(e => e.stage === 'TASKED')
      .reduce((sum, e) => sum + predictV(e, roles, automationRules.length * 0.1).predicted, 0);

    const automationRate = automationRules.filter(r => r.active).length * 0.1;

    // 차트용 데이터 (7일)
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const dayStart = Date.now() - (6 - i) * 86400000;
      const dayEnd = dayStart + 86400000;
      const dayEvents = events.filter(e => e.createdAt >= dayStart && e.createdAt < dayEnd);
      return {
        day: ['일', '월', '화', '수', '목', '금', '토'][new Date(dayStart).getDay()],
        count: dayEvents.length,
        value: dayEvents.reduce((sum, e) => sum + (e.value || 0), 0),
      };
    });

    return { byStage, totalV, automationRate, chartData };
  }, [events, roles, automationRules]);

  // 통합 토글
  const toggleIntegration = (integrationId) => {
    setIntegrations(prev => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        enabled: !prev[integrationId]?.enabled,
      },
    }));
  };

  // 알림 토글
  const toggleNotification = (notificationId) => {
    setNotifications(prev => ({
      ...prev,
      [notificationId]: !prev[notificationId],
    }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0A0F 0%, #1A1A2E 100%)',
      color: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* AUTUS Navigation */}
      <AUTUSNav currentHash="#producer" />

      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid #2E2E3E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{appName}</div>
            <div style={{ fontSize: 11, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              AUTUS 생산자 앱
              {isRuntimeConnected && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 6px', borderRadius: 4,
                  background: '#10B98120', color: '#10B981', fontSize: 9,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                  Runtime
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'dashboard', label: '대시보드', icon: '📊' },
            { id: 'workflow', label: '워크플로우', icon: '🔄' },
            { id: 'integrations', label: '통합', icon: '🔗' },
            { id: 'notifications', label: '알림', icon: '🔔' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: 8,
                background: activeTab === tab.id ? '#F9731630' : 'transparent',
                border: activeTab === tab.id ? '1px solid #F97316' : '1px solid transparent',
                color: activeTab === tab.id ? '#F97316' : '#94A3B8',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ padding: 24 }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            appName={appName}
            roles={roles}
            members={members}
            events={events}
            stats={stats}
            onCreateEvent={createEvent}
            onAdvanceEvent={advanceEvent}
          />
        )}

        {activeTab === 'workflow' && (
          <WorkflowBuilderView
            roles={roles}
            nodes={workflowNodes}
            connections={workflowConnections}
            onNodesChange={setWorkflowNodes}
            onConnectionsChange={setWorkflowConnections}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsView
            integrations={integrations}
            onToggle={toggleIntegration}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            integrations={integrations}
            onToggle={toggleNotification}
          />
        )}
      </main>

      {/* MoltBot 플로팅 챗봇 */}
      <MoltBotChat
        onPainSignal={async (signal) => {
          console.log('🦎 Pain Signal:', signal);

          // 런타임이 연결되어 있으면 런타임을 통해 처리
          if (isRuntimeConnected && AUTUSRuntime.isRunning) {
            await AUTUSRuntime.processInput(signal.text || signal.type || 'Pain Signal');
          }

          // 로컬 이벤트도 생성
          if (signal.proposal) {
            createEvent(signal.type || 'Pain Signal', { value: 10000, ...signal }, 'producer');
          }
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW (with Charts)
// ═══════════════════════════════════════════════════════════════════════════════

function DashboardView({ appName, roles, members, events, stats, onCreateEvent, onAdvanceEvent }) {
  const [newEvent, setNewEvent] = useState({ type: '', value: 10000 });
  const approverRole = roles.find(r => r.canApprove);

  // 차트 최대값
  const maxChartValue = Math.max(...stats.chartData.map(d => d.value), 1);

  return (
    <div>
      {/* 헤더 통계 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, padding: 20, borderRadius: 12,
        background: 'linear-gradient(135deg, #F9731620, #EF444420)',
        border: '1px solid #F97316',
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>생산자 앱</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{appName}</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>
            {roles.length}개 역할 · {members.length}명 멤버 · 자동화 {(stats.automationRate * 100).toFixed(0)}%
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, opacity: 0.6 }}>예측 V (완료 기준)</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#10B981' }}>
            ₩{stats.totalV.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 이벤트 단계별 현황 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {Object.values(EVENT_STAGES).map(stage => (
          <div key={stage.id} style={{
            padding: 16, borderRadius: 12, textAlign: 'center',
            background: stage.color + '10', border: `1px solid ${stage.color}30`,
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{stage.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: stage.color }}>
              {stats.byStage[stage.id] || 0}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{stage.name}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 📊 차트 영역 */}
        <section>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>📈 7일 V 추이</h3>
          <div style={{
            padding: 20, borderRadius: 12,
            background: '#1A1A2E', border: '1px solid #2E2E3E',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {stats.chartData.map((data, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      height: `${(data.value / maxChartValue) * 100}%`,
                      minHeight: 4,
                      background: 'linear-gradient(180deg, #F97316, #EF4444)',
                      borderRadius: '4px 4px 0 0',
                      marginBottom: 8,
                      transition: 'height 0.3s',
                    }}
                  />
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>{data.day}</div>
                  <div style={{ fontSize: 9, color: '#6B7280' }}>
                    {data.value > 0 ? `₩${(data.value / 1000).toFixed(0)}k` : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 실행 상태 도넛 */}
          <div style={{
            marginTop: 16, padding: 20, borderRadius: 12,
            background: '#1A1A2E', border: '1px solid #2E2E3E',
          }}>
            <h4 style={{ fontSize: 12, opacity: 0.5, marginBottom: 12 }}>🎯 실행 상태</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* 간단 도넛 차트 */}
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2E2E3E" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" stroke="#10B981" strokeWidth="3"
                    strokeDasharray={`${(stats.byStage.TASKED / Math.max(events.length, 1)) * 100} 100`}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#10B981',
                }}>
                  {events.length > 0 ? Math.round((stats.byStage.TASKED / events.length) * 100) : 0}%
                </div>
              </div>
              <div style={{ flex: 1, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#10B981' }}>● 완료</span>
                  <span>{stats.byStage.TASKED || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#F59E0B' }}>● 진행중</span>
                  <span>{(stats.byStage.APPROVED || 0) + (stats.byStage.AUTOMATED || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>● 대기</span>
                  <span>{stats.byStage.UNIFIED || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 이벤트 파이프라인 */}
        <section>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>📋 이벤트 파이프라인</h3>

          {/* 이벤트 생성 */}
          <div style={{
            padding: 16, borderRadius: 12, marginBottom: 12,
            background: '#1A1A2E', border: '1px solid #2E2E3E',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="이벤트 유형"
                value={newEvent.type}
                onChange={e => setNewEvent(ev => ({ ...ev, type: e.target.value }))}
                style={{
                  flex: 1, padding: '10px 12px',
                  background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                  color: '#F8FAFC', fontSize: 13,
                }}
              />
              <input
                type="number"
                placeholder="가치"
                value={newEvent.value}
                onChange={e => setNewEvent(ev => ({ ...ev, value: Number(e.target.value) }))}
                style={{
                  width: 100, padding: '10px 12px',
                  background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                  color: '#F8FAFC', fontSize: 13,
                }}
              />
              <button
                onClick={() => {
                  if (newEvent.type) {
                    onCreateEvent(newEvent.type, { value: newEvent.value }, 'producer');
                    setNewEvent({ type: '', value: 10000 });
                  }
                }}
                style={{
                  padding: '10px 16px', borderRadius: 6,
                  background: '#3B82F6', border: 'none',
                  color: 'white', fontWeight: 600, cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* 이벤트 목록 */}
          <div style={{ maxHeight: 320, overflow: 'auto' }}>
            {events.map(event => {
              const stage = EVENT_STAGES[event.stage];
              const vPrediction = predictV(event, roles, stats.automationRate);
              const stageOrder = ['UNIFIED', 'AUTOMATED', 'APPROVED', 'TASKED'];
              const currentIdx = stageOrder.indexOf(event.stage);
              const nextStage = currentIdx < 3 ? stageOrder[currentIdx + 1] : null;

              return (
                <div key={event.id} style={{
                  padding: 12, borderRadius: 8, marginBottom: 8,
                  background: '#0D0D12', border: `1px solid ${stage.color}40`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{event.type}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        V: ₩{vPrediction.predicted.toLocaleString()}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11,
                      background: stage.color + '20', color: stage.color,
                    }}>
                      {stage.icon} {stage.name}
                    </span>
                  </div>

                  {nextStage && (
                    <button
                      onClick={() => onAdvanceEvent(event.id, nextStage, approverRole?.id)}
                      style={{
                        width: '100%', padding: '8px', borderRadius: 6,
                        background: EVENT_STAGES[nextStage].color + '20',
                        border: `1px solid ${EVENT_STAGES[nextStage].color}40`,
                        color: EVENT_STAGES[nextStage].color,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      → {EVENT_STAGES[nextStage].name}로 진행
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW BUILDER VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function WorkflowBuilderView({ roles, nodes, connections, onNodesChange, onConnectionsChange }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);

  const handleNodeDrag = useCallback((nodeId, newX, newY) => {
    onNodesChange(nodes.map(n =>
      n.id === nodeId ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n
    ));
  }, [nodes, onNodesChange]);

  const getNodeColor = (node) => {
    if (node.type === 'ROLE') {
      const role = roles.find(r => r.id === node.roleId);
      return role?.color || '#6B7280';
    }
    if (node.type === 'STAGE') {
      const stage = EVENT_STAGES[node.stageId];
      return stage?.color || '#6B7280';
    }
    return WORKFLOW_NODE_TYPES[node.type]?.color || '#6B7280';
  };

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>워크플로우 빌더</h2>
          <p style={{ fontSize: 12, opacity: 0.6 }}>
            노드를 드래그하여 이벤트 흐름을 설계하세요
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.values(WORKFLOW_NODE_TYPES).map(nodeType => (
            <div
              key={nodeType.type}
              style={{
                padding: '6px 12px', borderRadius: 6,
                background: nodeType.color + '20', border: `1px solid ${nodeType.color}40`,
                fontSize: 11, color: nodeType.color, cursor: 'grab',
              }}
            >
              {nodeType.icon} {nodeType.name}
            </div>
          ))}
        </div>
      </div>

      {/* 캔버스 */}
      <div style={{
        position: 'relative',
        height: 400,
        background: '#0D0D12',
        borderRadius: 12,
        border: '1px solid #2E2E3E',
        overflow: 'hidden',
      }}>
        {/* 그리드 */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E1E2E" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* 연결선 */}
          {connections.map((conn, i) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            const fromX = fromNode.x + 50;
            const fromY = fromNode.y + 25;
            const toX = toNode.x;
            const toY = toNode.y + 25;

            return (
              <g key={i}>
                <path
                  d={`M ${fromX} ${fromY} C ${fromX + 50} ${fromY}, ${toX - 50} ${toY}, ${toX} ${toY}`}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  opacity="0.5"
                />
                <circle cx={toX} cy={toY} r="4" fill="#3B82F6" />
              </g>
            );
          })}
        </svg>

        {/* 노드 */}
        {nodes.map(node => {
          const color = getNodeColor(node);
          const nodeType = WORKFLOW_NODE_TYPES[node.type];

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
              onMouseDown={(e) => {
                setDraggingNode(node.id);
                const startX = e.clientX - node.x;
                const startY = e.clientY - node.y;

                const handleMove = (moveEvent) => {
                  handleNodeDrag(node.id, moveEvent.clientX - startX, moveEvent.clientY - startY);
                };

                const handleUp = () => {
                  setDraggingNode(null);
                  document.removeEventListener('mousemove', handleMove);
                  document.removeEventListener('mouseup', handleUp);
                };

                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
              }}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: 100,
                height: 50,
                background: color + '20',
                border: `2px solid ${selectedNode === node.id ? '#F97316' : color}`,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: draggingNode === node.id ? 'grabbing' : 'grab',
                transition: draggingNode === node.id ? 'none' : 'border-color 0.2s',
                boxShadow: selectedNode === node.id ? `0 0 20px ${color}40` : 'none',
              }}
            >
              <span style={{ fontSize: 16 }}>{nodeType?.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color }}>{node.label}</span>
            </div>
          );
        })}
      </div>

      {/* 노드 상세 */}
      {selectedNode && (
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 12,
          background: '#1A1A2E', border: '1px solid #2E2E3E',
        }}>
          <h4 style={{ fontSize: 14, marginBottom: 12 }}>노드 설정</h4>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, opacity: 0.5, display: 'block', marginBottom: 4 }}>라벨</label>
              <input
                value={nodes.find(n => n.id === selectedNode)?.label || ''}
                onChange={(e) => onNodesChange(nodes.map(n =>
                  n.id === selectedNode ? { ...n, label: e.target.value } : n
                ))}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                  color: '#F8FAFC', fontSize: 13,
                }}
              />
            </div>
            <button
              onClick={() => {
                onNodesChange(nodes.filter(n => n.id !== selectedNode));
                onConnectionsChange(connections.filter(c => c.from !== selectedNode && c.to !== selectedNode));
                setSelectedNode(null);
              }}
              style={{
                padding: '8px 16px', borderRadius: 6,
                background: '#EF444420', border: '1px solid #EF4444',
                color: '#EF4444', fontSize: 12, cursor: 'pointer',
              }}
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function IntegrationsView({ integrations, onToggle }) {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>통합 서비스</h2>
      <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 24 }}>
        외부 서비스와 연동하여 워크플로우를 자동화하세요
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {Object.values(INTEGRATIONS).map(integration => {
          const isEnabled = integrations[integration.id]?.enabled;

          return (
            <div
              key={integration.id}
              style={{
                padding: 20, borderRadius: 12,
                background: isEnabled ? integration.color + '10' : '#1A1A2E',
                border: `2px solid ${isEnabled ? integration.color : '#2E2E3E'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => onToggle(integration.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{integration.icon}</span>
                <div style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: isEnabled ? integration.color : '#2E2E3E',
                  padding: 2,
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9,
                    background: 'white',
                    transform: isEnabled ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s',
                  }} />
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{integration.name}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{integration.desc}</div>

              {isEnabled && integrations[integration.id]?.config && (
                <div style={{
                  marginTop: 12, paddingTop: 12,
                  borderTop: `1px solid ${integration.color}30`,
                  fontSize: 11, color: integration.color,
                }}>
                  ✓ 연결됨
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 커스텀 Webhook 설정 */}
      {integrations.webhook?.enabled && (
        <div style={{
          marginTop: 24, padding: 20, borderRadius: 12,
          background: '#1A1A2E', border: '1px solid #2E2E3E',
        }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>🔗 Webhook 설정</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              placeholder="https://your-api.com/webhook"
              style={{
                flex: 1, padding: '12px 16px',
                background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 8,
                color: '#F8FAFC', fontSize: 13,
              }}
            />
            <button style={{
              padding: '12px 24px', borderRadius: 8,
              background: '#3B82F6', border: 'none',
              color: 'white', fontWeight: 600, cursor: 'pointer',
            }}>
              테스트
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function NotificationsView({ notifications, integrations, onToggle }) {
  const enabledChannels = Object.entries(integrations)
    .filter(([_, v]) => v.enabled)
    .map(([k]) => INTEGRATIONS[k]?.name)
    .filter(Boolean);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>알림 설정</h2>
      <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 24 }}>
        이벤트 발생 시 알림을 받을 조건을 설정하세요
      </p>

      {/* 활성 채널 */}
      <div style={{
        padding: 16, borderRadius: 12, marginBottom: 24,
        background: '#10B98110', border: '1px solid #10B98130',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>📡</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>활성 채널</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            {enabledChannels.length > 0 ? enabledChannels.join(', ') : '통합 탭에서 채널을 연결하세요'}
          </div>
        </div>
      </div>

      {/* 알림 유형 */}
      <div style={{
        padding: 20, borderRadius: 12,
        background: '#1A1A2E', border: '1px solid #2E2E3E',
      }}>
        <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 16 }}>알림 유형</h3>

        {Object.values(NOTIFICATION_TYPES).map(notif => {
          const isEnabled = notifications[notif.id];

          return (
            <div
              key={notif.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid #2E2E3E',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{notif.icon}</span>
                <span>{notif.name}</span>
              </div>
              <div
                onClick={() => onToggle(notif.id)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: isEnabled ? '#10B981' : '#2E2E3E',
                  padding: 2, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 10,
                  background: 'white',
                  transform: isEnabled ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 고급 설정 */}
      <div style={{
        marginTop: 24, padding: 20, borderRadius: 12,
        background: '#1A1A2E', border: '1px solid #2E2E3E',
      }}>
        <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 16 }}>⚙️ 고급 설정</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, opacity: 0.7, display: 'block', marginBottom: 8 }}>
            V 임계치 알림 기준
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="number"
              placeholder="100000"
              defaultValue={100000}
              style={{
                width: 150, padding: '10px 12px',
                background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                color: '#F8FAFC', fontSize: 13,
              }}
            />
            <span style={{ fontSize: 12, opacity: 0.5 }}>원 이상 달성 시</span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, opacity: 0.7, display: 'block', marginBottom: 8 }}>
            방해금지 시간
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="time"
              defaultValue="22:00"
              style={{
                padding: '10px 12px',
                background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                color: '#F8FAFC', fontSize: 13,
              }}
            />
            <span style={{ opacity: 0.5 }}>~</span>
            <input
              type="time"
              defaultValue="08:00"
              style={{
                padding: '10px 12px',
                background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                color: '#F8FAFC', fontSize: 13,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
