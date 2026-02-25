/**
 * 🏀 올댓바스켓 - AUTUS Brand OS (실제 동작 버전)
 *
 * 팩폭 후 개선:
 * - 전역 상태 관리로 실제 데이터 흐름 구현
 * - alert() 대신 실제 상태 변경
 * - 역할 간 데이터 공유 (원장 ↔ 관리자 ↔ 코치)
 *
 * 조직 계층:
 * 1. 원장이 관리자를 지정한다
 * 2. 관리자는 외부 시스템과 연결한다
 * 3. 관리자는 강사를 지정한다
 * 4. 강사는 자신의 업무를 한다
 * 5. 관리자는 강사 업무 체크와 원장에게 피드백한다
 * 6. 원장은 다음 행동을 결정한다
 *
 * AUTUS 규칙: 버튼 ≤3, 입력=0, 설정=0, AUTUS 노출 금지
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useStore, selectors } from './store.jsx';

// Lazy load ProcessMap for hash routing
const ProcessMap = lazy(() => import('./pages/allthatbasket/ProcessMap'));
const ProcessMapV2 = lazy(() => import('./pages/allthatbasket/ProcessMapV2'));
const ProcessMapV3 = lazy(() => import('./pages/allthatbasket/ProcessMapV3'));
const ProcessMapV4 = lazy(() => import('./pages/allthatbasket/ProcessMapV4'));
const ProcessMapV5 = lazy(() => import('./pages/allthatbasket/ProcessMapV5'));
const ProcessMapV6 = lazy(() => import('./pages/allthatbasket/ProcessMapV6'));
const ProcessMapV7 = lazy(() => import('./pages/allthatbasket/ProcessMapV7'));
const ProcessMapV8 = lazy(() => import('./pages/allthatbasket/ProcessMapV8'));
const ProcessMapV9 = lazy(() => import('./ProcessMapV9'));
const ProcessMapV10 = lazy(() => import('./ProcessMapV10'));
const DecisionDashboard = lazy(() => import('./pages/allthatbasket/DecisionDashboard'));
const ProcessHub = lazy(() => import('./ProcessHub'));
const ProcessMapV11 = lazy(() => import('./ProcessMapV11'));
const ProcessMapV12 = lazy(() => import('./ProcessMapV12'));
const AUTUSInternal = lazy(() => import('./AUTUSInternal'));
const AUTUSFinal = lazy(() => import('./AUTUSFinal'));
const AUTUSUniversal = lazy(() => import('./pages/allthatbasket/AUTUSUniversal'));
const AUTUSAmazon = lazy(() => import('./pages/allthatbasket/AUTUSAmazon'));
const AUTUSDecisionOS = lazy(() => import('./pages/allthatbasket/AUTUSDecisionOS'));
const AUTUSFactory = lazy(() => import('./pages/allthatbasket/AUTUSFactory'));
const AUTUSCore = lazy(() => import('./pages/allthatbasket/AUTUSCore'));
const AUTUSLive = lazy(() => import('./pages/allthatbasket/AUTUSLive'));
const AUTUS = lazy(() => import('./pages/allthatbasket/AUTUS'));
const AUTUSBlueprint = lazy(() => import('./pages/allthatbasket/AUTUSBlueprint'));
const AUTUSProducer = lazy(() => import('./pages/allthatbasket/AUTUSProducer'));
const AUTUSMoltBot = lazy(() => import('./pages/allthatbasket/AUTUSMoltBot'));
const AUTUSFlowTune = lazy(() => import('./pages/allthatbasket/AUTUSFlowTune'));
const AUTUSVFactory = lazy(() => import('./pages/allthatbasket/AUTUSVFactory'));
const AUTUSOperations = lazy(() => import('./pages/allthatbasket/AUTUSOperations'));
const AUTUSUnified = lazy(() => import('./pages/allthatbasket/AUTUSUnified'));
const AdminDashboard = lazy(() => import('./pages/allthatbasket/AdminDashboard'));
const CoachDashboard = lazy(() => import('./pages/allthatbasket/CoachDashboard'));
const PaymentManager = lazy(() => import('./pages/allthatbasket/PaymentManager'));
const MakeupRequest = lazy(() => import('./pages/allthatbasket/MakeupRequest'));

// ============================================
// 🏠 역할 선택
// ============================================
function RoleSelector() {
  const { actions } = useStore();

  const handleSelect = (role) => {
    // 실제 로그인 대신 역할 선택 (데모용)
    const users = {
      owner: { id: 'owner-1', name: '원장님', role: 'owner' },
      admin: { id: 'admin-1', name: '김관리', role: 'admin' },
      coach: { id: 'coach-1', name: '박코치', role: 'coach' },
      parent: { id: 'parent-1', name: '학부모', role: 'parent' },
    };
    actions.setUser(users[role]);
    actions.setRole(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
          <span className="text-4xl">🏀</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">올댓바스켓</h1>
        <p className="text-gray-500 text-center">농구로 성장하는 우리 아이</p>
      </div>

      <div className="p-6 space-y-3">
        {[
          { role: 'owner', label: '원장님', icon: '👔', color: 'bg-gray-900' },
          { role: 'admin', label: '관리자', icon: '💼', color: 'bg-blue-600' },
          { role: 'coach', label: '코치', icon: '🏃', color: 'bg-orange-500' },
          { role: 'parent', label: '학부모', icon: '👨‍👩‍👧', color: 'bg-white text-gray-700 border-2 border-gray-100' },
        ].map(({ role, label, icon, color }) => (
          <button
            key={role}
            onClick={() => handleSelect(role)}
            className={`w-full py-4 ${color} ${role !== 'parent' ? 'text-white' : ''} rounded-2xl font-semibold text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3`}
          >
            <span className="text-2xl">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="p-6 pt-0">
        <p className="text-center text-xs text-gray-400">© 올댓바스켓 농구 아카데미</p>
      </div>
    </div>
  );
}

// ============================================
// 📊 상태 카드
// ============================================
function StatusCard({ status, count, label, subtitle, onClick }) {
  const styles = {
    normal: 'bg-emerald-50 border-emerald-100',
    warning: 'bg-amber-50 border-amber-100',
    danger: 'bg-red-50 border-red-100'
  };
  const textColors = {
    normal: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600'
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 ${styles[status]} text-left active:scale-95 transition-all w-full`}
    >
      <div className={`text-3xl font-bold ${textColors[status]}`}>{count}</div>
      <div className="text-sm font-medium text-gray-700 mt-1">{label}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </button>
  );
}

// ============================================
// 🔔 긴급 알림 배너
// ============================================
function UrgentBanner({ message, type = 'warning', onDismiss }) {
  const styles = {
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <div className={`${styles[type]} text-white px-4 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{type === 'danger' ? '🚨' : '⚠️'}</span>
        <span className="text-sm font-medium">{message}</span>
      </div>
      <button onClick={onDismiss} className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
        확인
      </button>
    </div>
  );
}

// ============================================
// 💳 승인 카드
// ============================================
function ApprovalCard({ card, onDecision }) {
  const typeInfo = {
    payment: { icon: '💳', label: '결제', color: 'red' },
    absence: { icon: '📅', label: '출석', color: 'amber' },
    refund: { icon: '↩️', label: '환불', color: 'blue' },
  };
  const info = typeInfo[card.type] || { icon: '📋', label: '기타', color: 'gray' };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <span className="text-xl">{info.icon}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{card.title}</div>
            <div className="text-sm text-gray-500">{card.studentName}</div>
          </div>
        </div>
        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
          {info.label}
        </span>
      </div>

      {card.amount && (
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <div className="text-xs text-gray-500">금액</div>
          <div className="text-2xl font-bold text-gray-900">{card.amount.toLocaleString()}원</div>
        </div>
      )}

      {/* 3버튼 규칙 */}
      <div className="flex gap-2">
        <button
          onClick={() => onDecision(card.id, 'approved')}
          className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold active:scale-95 transition-all"
        >
          승인
        </button>
        <button
          onClick={() => onDecision(card.id, 'hold')}
          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold active:scale-95 transition-all"
        >
          보류
        </button>
        <button
          onClick={() => onDecision(card.id, 'rejected')}
          className="flex-1 py-3 bg-white text-red-500 rounded-xl font-semibold border-2 border-red-100 active:scale-95 transition-all"
        >
          거절
        </button>
      </div>
    </div>
  );
}

// ============================================
// 👔 원장 화면
// ============================================
function OwnerView() {
  const { state, actions } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [urgentAlert, setUrgentAlert] = useState(null);

  const stats = selectors.getStudentStats(state);
  const unreadFeedbacks = selectors.getUnreadFeedbacks(state);
  const pendingApprovals = selectors.getPendingApprovals(state);

  useEffect(() => {
    if (pendingApprovals.length > 0) {
      setUrgentAlert(`승인 대기 ${pendingApprovals.length}건 - 확인이 필요합니다`);
    }
  }, [pendingApprovals]);

  const handleDecision = async (approvalId, decision) => {
    // 결제 타입인 경우 실제 결제 완료 처리
    const approval = pendingApprovals.find(a => a.id === approvalId);
    if (approval?.type === 'payment' && decision === 'approved') {
      await actions.completePayment(approval.paymentId, approvalId);
    }
    actions.decideApproval(approvalId, decision);
    actions.logEvent({ type: 'OWNER_DECISION', data: { approvalId, decision } });
  };

  const handleAssignRole = (staffId, newRole) => {
    actions.assignRole(staffId, newRole);
  };

  const handleReadFeedback = (feedbackId) => {
    actions.readFeedback(feedbackId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {urgentAlert && (
        <UrgentBanner message={urgentAlert} type="danger" onDismiss={() => setUrgentAlert(null)} />
      )}

      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={() => actions.setRole(null)} className="w-10 h-10 flex items-center justify-center text-gray-400 text-xl">←</button>
          <h1 className="text-lg font-bold text-gray-900">올댓바스켓</h1>
          <button onClick={actions.refresh} className="w-10 h-10 flex items-center justify-center text-gray-400 text-xl">↻</button>
        </div>
      </header>

      {/* 탭 */}
      <div className="bg-white px-4 py-2 border-b border-gray-100 flex gap-1">
        {[
          { key: 'dashboard', label: '대시보드', icon: '📊' },
          { key: 'team', label: '팀 관리', icon: '👥' },
          { key: 'insights', label: '인사이트', icon: '💡', badge: state.insights.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === tab.key ? 'bg-orange-100 text-orange-600' : 'text-gray-500'
            }`}
          >
            {tab.icon} {tab.label}
            {tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="p-4 pb-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">안녕하세요, {state.currentUser?.name} 👋</h2>
          <p className="text-gray-500 mt-1">
            {activeTab === 'dashboard' && '오늘도 좋은 하루 되세요'}
            {activeTab === 'team' && '팀을 관리하세요'}
            {activeTab === 'insights' && '앞으로 무엇을 해야 할까요?'}
          </p>
        </div>

        {/* 대시보드 */}
        {activeTab === 'dashboard' && (
          <>
            {/* KPI 카드 - Supabase 연동 */}
            {state.dashboardStats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                    <p className="text-2xl font-bold text-green-700">{((state.dashboardStats.monthlyCollected || 0) / 10000).toFixed(0)}만원</p>
                    <p className="text-xs text-green-600 mt-1">이번달 매출</p>
                  </div>
                  <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                    <p className="text-2xl font-bold text-red-700">{((state.dashboardStats.totalOutstanding || 0) / 10000).toFixed(0)}만원</p>
                    <p className="text-xs text-red-600 mt-1">미수금</p>
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                    <p className="text-2xl font-bold text-blue-700">{state.dashboardStats.newStudentsThisMonth ?? 0}명</p>
                    <p className="text-xs text-blue-600 mt-1">신규 학생</p>
                  </div>
                  <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                    <p className="text-2xl font-bold text-purple-700">{state.dashboardStats.todayAttendanceRate ?? 0}%</p>
                    <p className="text-xs text-purple-600 mt-1">오늘 출석율</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4 text-sm text-gray-600">
                  <span>직원 {state.staff?.length ?? 0}명</span>
                  <span>·</span>
                  <span>이탈 위험 {state.dashboardStats.atRiskCount ?? 0}명</span>
                </div>
              </>
            )}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatusCard status="normal" count={stats.normal} label="정상" subtitle="80% 이상" />
              <StatusCard status="warning" count={stats.warning} label="경고" subtitle="60-80%" />
              <StatusCard status="danger" count={stats.danger} label="위험" subtitle="즉시 확인" />
            </div>

            {/* 관리자 피드백 */}
            {unreadFeedbacks.length > 0 && (
              <div className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📩</span>
                  <span className="font-medium text-blue-800">새 피드백</span>
                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">{unreadFeedbacks.length}</span>
                </div>
                {unreadFeedbacks.slice(0, 2).map(fb => (
                  <div key={fb.id} className="bg-white rounded-xl p-3 mb-2 last:mb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{fb.from}</span>
                      <button
                        onClick={() => handleReadFeedback(fb.id)}
                        className="text-xs text-blue-600 font-medium"
                      >
                        읽음
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{fb.title}</p>
                    <ul className="text-xs text-gray-500 mt-1">
                      {fb.items.slice(0, 2).map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* 승인 대기 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-500">승인 대기</h3>
                <span className="text-sm text-orange-500 font-medium">{pendingApprovals.length}건</span>
              </div>
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map(card => (
                  <ApprovalCard key={card.id} card={card} onDecision={handleDecision} />
                ))
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <div className="text-4xl mb-3">✨</div>
                  <div className="text-gray-500">처리할 항목이 없습니다</div>
                </div>
              )}
            </section>
          </>
        )}

        {/* 팀 관리 */}
        {activeTab === 'team' && (
          <>
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">👔 관리자/코치 지정</h3>
              <div className="space-y-3">
                {state.staff.map(person => (
                  <div key={person.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          person.role === 'admin' ? 'bg-blue-100' : person.role === 'coach' ? 'bg-orange-100' : 'bg-gray-100'
                        }`}>
                          <span className="text-xl">{person.role === 'admin' ? '💼' : '🏃'}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{person.name}</div>
                          <div className="text-sm text-gray-500">
                            {person.role === 'admin' ? '관리자' : person.role === 'coach' ? '코치' : '미지정'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssignRole(person.id, 'admin')}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                          person.role === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        관리자
                      </button>
                      <button
                        onClick={() => handleAssignRole(person.id, 'coach')}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                          person.role === 'coach' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        코치
                      </button>
                      <button
                        onClick={() => handleAssignRole(person.id, null)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                          !person.role ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        해제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 모든 피드백 */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 mb-3">📩 피드백 기록</h3>
              {state.feedbacks.length > 0 ? (
                <div className="space-y-2">
                  {state.feedbacks.map(fb => (
                    <div key={fb.id} className={`bg-white rounded-xl p-3 border ${
                      fb.status === 'unread' ? 'border-blue-200' : 'border-gray-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{fb.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          fb.status === 'unread' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {fb.status === 'unread' ? '미확인' : '확인됨'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">{fb.from}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <div className="text-4xl mb-3">📭</div>
                  <div className="text-gray-500">아직 피드백이 없습니다</div>
                </div>
              )}
            </section>
          </>
        )}

        {/* 인사이트 */}
        {activeTab === 'insights' && (
          <>
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-4 mb-6 text-white">
              <div className="text-sm opacity-80">💡 이번 주 핵심 질문</div>
              <div className="text-lg font-bold mt-1">앞으로 무엇을 해야 할까요?</div>
            </div>

            {state.insights.length > 0 ? (
              <div className="space-y-3">
                {state.insights.map(insight => {
                  const colors = {
                    growth: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '📈' },
                    risk: { bg: 'bg-red-50', border: 'border-red-200', icon: '⚠️' },
                    alert: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '🔔' },
                  };
                  const style = colors[insight.type] || colors.alert;

                  return (
                    <div key={insight.id} className={`${style.bg} rounded-2xl p-4 border ${style.border}`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xl">{style.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{insight.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{insight.description}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (insight.action === '피드백 확인') setActiveTab('team');
                          else if (insight.action === '승인 처리') setActiveTab('dashboard');
                        }}
                        className="w-full mt-2 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium"
                      >
                        {insight.action}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                <div className="text-4xl mb-3">🎯</div>
                <div className="text-gray-500">모든 인사이트를 처리했습니다</div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ============================================
// 💼 관리자 화면
// ============================================
function AdminView() {
  const { state, actions } = useStore();
  const [activeTab, setActiveTab] = useState('overview');

  const coaches = selectors.getCoaches(state);
  const taskStats = selectors.getTaskStats(state);

  const handleSendFeedback = (type, title, items) => {
    actions.sendFeedback({ type, title, items });
    actions.logEvent({ type: 'ADMIN_FEEDBACK_SENT', data: { title } });
  };

  const handleConnectSystem = (connectionId) => {
    actions.connectSystem(connectionId);
  };

  const handleTaskCheck = (taskId) => {
    actions.completeTask(taskId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={() => actions.setRole(null)} className="w-10 h-10 flex items-center justify-center text-gray-400 text-xl">←</button>
          <h1 className="text-lg font-bold text-gray-900">올댓바스켓</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* 탭 */}
      <div className="bg-white px-2 py-2 border-b border-gray-100 flex gap-1 overflow-x-auto">
        {[
          { key: 'overview', label: '현황', icon: '📊' },
          { key: 'coaches', label: '강사', icon: '🏃' },
          { key: 'systems', label: '시스템', icon: '🔗' },
          { key: 'feedback', label: '피드백', icon: '📩' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <main className="p-4 pb-24">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">안녕하세요, {state.currentUser?.name} 💼</h2>
          <p className="text-gray-500 mt-1">오늘도 수고하세요</p>
        </div>

        {/* 현황 */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{state.students.length}</div>
                <div className="text-xs text-blue-600">전체 학생</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600">{taskStats.completed}</div>
                <div className="text-xs text-emerald-600">완료 업무</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{coaches.length}</div>
                <div className="text-xs text-orange-600">활동 코치</div>
              </div>
            </div>

            <h3 className="text-sm font-medium text-gray-500 mb-3">👥 학생 현황</h3>
            <div className="space-y-2">
              {state.students.map(student => (
                <div key={student.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {student.name}
                      <span className={`w-2 h-2 rounded-full ${
                        student.status === 'active' ? 'bg-emerald-500' :
                        student.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                    </div>
                    <div className="text-sm text-gray-500">{student.class}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{student.attendanceRate}%</div>
                    <div className="text-xs text-gray-400">출석률</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 강사 관리 */}
        {activeTab === 'coaches' && (
          <>
            <h3 className="text-sm font-medium text-gray-500 mb-3">🏃 코치 현황</h3>
            <div className="space-y-3 mb-6">
              {coaches.map(coach => (
                <div key={coach.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <span className="text-xl">🏃</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{coach.name}</div>
                        <div className="text-sm text-gray-500">코치</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-medium text-gray-500 mb-3">✅ 업무 체크</h3>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {state.tasks.map((task, idx) => (
                <div key={task.id} className={`p-3 flex items-center justify-between ${
                  idx < state.tasks.length - 1 ? 'border-b border-gray-50' : ''
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTaskCheck(task.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'
                      }`}
                      disabled={task.status === 'completed'}
                    >
                      {task.status === 'completed' && '✓'}
                    </button>
                    <div>
                      <div className={`text-sm ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-400">{task.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 시스템 연결 */}
        {activeTab === 'systems' && (
          <>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-4 mb-6 text-white">
              <div className="text-sm opacity-80">🔗 외부 시스템 연결</div>
              <div className="text-lg font-bold mt-1">
                연결됨: {state.connections.filter(c => c.status === 'connected').length}/{state.connections.length}
              </div>
            </div>

            <div className="space-y-3">
              {state.connections.map(conn => (
                <div key={conn.id} className={`bg-white rounded-2xl p-4 border ${
                  conn.status === 'connected' ? 'border-emerald-200' : 'border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                        {conn.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{conn.name}</div>
                        <div className="text-sm text-gray-500">
                          {conn.status === 'connected' ? '연결됨' : '연결 대기'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => conn.status === 'connected' ? actions.disconnectSystem(conn.id) : handleConnectSystem(conn.id)}
                    className={`w-full py-2 rounded-xl text-sm font-medium ${
                      conn.status === 'connected' ? 'bg-gray-100 text-gray-700' : 'bg-blue-500 text-white'
                    }`}
                  >
                    {conn.status === 'connected' ? '연결 해제' : '연결하기'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 원장 피드백 */}
        {activeTab === 'feedback' && (
          <>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 mb-6 text-white">
              <div className="text-sm opacity-80">📩 원장님께 피드백</div>
              <div className="text-lg font-bold mt-1">업무 현황을 공유하세요</div>
            </div>

            <div className="space-y-3">
              {/* 주간 보고 */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📋</span>
                  <span className="font-medium text-gray-900">주간 업무 보고</span>
                </div>
                <ul className="text-sm text-gray-600 mb-3 space-y-1">
                  <li>• 완료 업무: {taskStats.completed}건</li>
                  <li>• 대기 업무: {taskStats.pending}건</li>
                  <li>• 활동 코치: {coaches.length}명</li>
                </ul>
                <button
                  onClick={() => handleSendFeedback('report', '주간 업무 보고', [
                    `완료 업무: ${taskStats.completed}건`,
                    `대기 업무: ${taskStats.pending}건`,
                    `활동 코치: ${coaches.length}명`,
                  ])}
                  className="w-full py-2 bg-purple-500 text-white rounded-xl text-sm font-medium"
                >
                  원장님께 전송
                </button>
              </div>

              {/* 긴급 보고 */}
              <div className="bg-white rounded-2xl p-4 border border-red-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🚨</span>
                  <span className="font-medium text-gray-900">긴급 사항</span>
                </div>
                <button
                  onClick={() => handleSendFeedback('alert', '긴급 사항 보고', ['확인이 필요한 긴급 사항이 있습니다.'])}
                  className="w-full py-2 bg-red-500 text-white rounded-xl text-sm font-medium"
                >
                  긴급 보고
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ============================================
// 🏃 코치 화면 (Supabase 실제 데이터)
// ============================================
function CoachView() {
  const { state, actions } = useStore();
  const [activeTab, setActiveTab] = useState('class');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeClassId, setActiveClassId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // 실제 코치 ID로 필터링 (데모: 모든 tasks)
  const myTasks = state.tasks.filter(t => t.coachId === state.currentUser?.id || true);
  const taskStats = selectors.getTaskStats(state);

  // 실제 학생 데이터 (Supabase에서 로드됨)
  const myStudents = state.students || [];

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleCompleteTask = (taskId) => {
    actions.completeTask(taskId);
    actions.logEvent({ type: 'COACH_TASK_COMPLETED', data: { taskId } });
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 촬영 오버레이 */}
      {isRecording && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
          <div className="text-red-500 text-6xl mb-4 animate-pulse">●</div>
          <div className="text-white text-4xl font-mono mb-2">{formatTime(recordingTime)}</div>
          <div className="text-white/60 mb-8">촬영 중...</div>
          <button
            onClick={() => {
              setIsRecording(false);
              actions.logEvent({ type: 'VIDEO_RECORDED', data: { duration: recordingTime } });
            }}
            className="px-8 py-4 bg-red-500 text-white rounded-2xl font-bold text-lg"
          >
            촬영 완료
          </button>
        </div>
      )}

      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={() => actions.setRole(null)} className="w-10 h-10 flex items-center justify-center text-gray-400 text-xl">←</button>
          <h1 className="text-lg font-bold text-gray-900">올댓바스켓</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* 탭 */}
      <div className="bg-white px-4 py-2 border-b border-gray-100 flex gap-1">
        {[
          { key: 'class', label: '수업', icon: '🏀' },
          { key: 'tasks', label: '업무', icon: '✅', badge: taskStats.pending },
          { key: 'report', label: '보고', icon: '📩' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium relative ${
              activeTab === tab.key ? 'bg-orange-100 text-orange-600' : 'text-gray-500'
            }`}
          >
            {tab.icon} {tab.label}
            {tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="p-4 pb-32">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">화이팅, {state.currentUser?.name}! 💪</h2>
          <p className="text-gray-500 mt-1">
            {activeTab === 'class' && `오늘 수업 ${state.classes.length}개`}
            {activeTab === 'tasks' && `완료 ${taskStats.completed}/${taskStats.total}`}
            {activeTab === 'report' && '관리자님께 보고하세요'}
          </p>
        </div>

        {/* 수업 */}
        {activeTab === 'class' && (
          <>
            <button
              onClick={() => { setIsRecording(true); setRecordingTime(0); }}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">📹</span>
                <div className="text-left">
                  <div className="font-bold">훈련 영상 촬영</div>
                  <div className="text-sm opacity-80">촬영만 하세요!</div>
                </div>
              </div>
              <span className="text-2xl">→</span>
            </button>

            {/* 학생 목록 (실제 Supabase 데이터) */}
            <h3 className="text-sm font-medium text-gray-500 mb-3">🏀 내 학생 ({myStudents.length}명)</h3>
            <div className="space-y-2 mb-6">
              {myStudents.map(student => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(selectedStudent?.id === student.id ? null : student)}
                  className={`bg-white rounded-xl p-3 border-2 cursor-pointer active:scale-[0.98] transition-all ${
                    selectedStudent?.id === student.id ? 'border-orange-500' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative ${
                        student.status === 'active' ? 'bg-emerald-100' :
                        student.status === 'warning' ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <span className="text-lg">🏀</span>
                        {student.todayAttendance === 'present' && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {student.name}
                          {student.position && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{student.position}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{student.class}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        student.attendanceRate >= 80 ? 'text-emerald-600' :
                        student.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>{student.attendanceRate}%</div>
                      <div className="text-xs text-gray-400">참여율</div>
                    </div>
                  </div>
                  {selectedStudent?.id === student.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <div className="text-xs text-blue-600">스킬점수</div>
                          <div className="text-lg font-bold text-blue-700">{student.skillScore || 50}</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2 text-center">
                          <div className="text-xs text-purple-600">학부모 연락처</div>
                          <div className="text-sm font-medium text-purple-700">{student.parentPhone || '-'}</div>
                        </div>
                      </div>
                      {/* 출석 체크 버튼 */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.checkIn(student.id, activeClassId);
                          }}
                          disabled={student.todayAttendance === 'present'}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                            student.todayAttendance === 'present'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-emerald-500 text-white active:scale-95'
                          }`}
                        >
                          {student.todayAttendance === 'present' ? '✓ 출석완료' : '출석 체크'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.markAbsent(student.id, new Date().toISOString().split('T')[0], '');
                          }}
                          className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium active:scale-95"
                        >
                          결석 처리
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {myStudents.length === 0 && (
                <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400">
                  등록된 학생이 없습니다
                </div>
              )}
            </div>

            <h3 className="text-sm font-medium text-gray-500 mb-3">📅 오늘 수업</h3>
            <div className="space-y-3">
              {state.classes.length > 0 ? state.classes.map(cls => (
                <div key={cls.id} className={`bg-white rounded-2xl p-4 border-2 ${
                  activeClassId === cls.id ? 'border-orange-500' : 'border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">{cls.name}</div>
                      <div className="text-sm text-gray-500">{cls.time} · {cls.studentCount}명</div>
                    </div>
                    {activeClassId === cls.id && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs animate-pulse">
                        진행 중
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (activeClassId === cls.id) {
                        setActiveClassId(null);
                        actions.logEvent({ type: 'CLASS_ENDED', data: { classId: cls.id } });
                      } else {
                        setActiveClassId(cls.id);
                        actions.logEvent({ type: 'CLASS_STARTED', data: { classId: cls.id } });
                      }
                    }}
                    className={`w-full py-3 rounded-xl font-semibold ${
                      activeClassId === cls.id ? 'bg-gray-800 text-white' : 'bg-orange-500 text-white'
                    }`}
                  >
                    {activeClassId === cls.id ? '수업 종료' : '수업 시작'}
                  </button>
                </div>
              )) : (
                <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400">
                  오늘 예정된 수업이 없습니다
                </div>
              )}
            </div>
          </>
        )}

        {/* 업무 */}
        {activeTab === 'tasks' && (
          <>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 mb-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-80">오늘 업무 진행률</div>
                  <div className="text-3xl font-bold mt-1">
                    {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                  </div>
                </div>
                <div className="text-2xl font-bold">{taskStats.completed}/{taskStats.total}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {myTasks.map((task, idx) => (
                <div key={task.id} className={`p-4 flex items-center justify-between ${
                  idx < myTasks.length - 1 ? 'border-b border-gray-50' : ''
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                        task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'
                      }`}
                      disabled={task.status === 'completed'}
                    >
                      {task.status === 'completed' && '✓'}
                    </button>
                    <div>
                      <div className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-400">{task.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 보고 */}
        {activeTab === 'report' && (
          <>
            <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-3">📊 오늘 현황</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{taskStats.completed}</div>
                  <div className="text-xs text-emerald-600">완료</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{taskStats.pending}</div>
                  <div className="text-xs text-amber-600">대기</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{state.classes.length}</div>
                  <div className="text-xs text-blue-600">수업</div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 text-center">
              업무 완료 시 관리자님께 자동 보고됩니다
            </p>
          </>
        )}
      </main>
    </div>
  );
}

// ============================================
// 👨‍👩‍👧 학부모 화면 (Supabase 실제 데이터)
// ============================================
function ParentView() {
  const { state, actions } = useStore();
  const [activeTab, setActiveTab] = useState('home');

  // 실제 자녀 데이터 (데모: 첫 번째 학생)
  const child = state.students[0];

  // 참여율 기반 연속 출석 계산 (데모용)
  const streakDays = child ? Math.floor(child.attendanceRate / 14) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button onClick={() => actions.setRole(null)} className="w-10 h-10 flex items-center justify-center text-gray-400 text-xl">←</button>
          <h1 className="text-lg font-bold text-gray-900">올댓바스켓</h1>
          <button onClick={actions.refresh} className="w-10 h-10 flex items-center justify-center text-gray-400 text-xl">↻</button>
        </div>
      </header>

      {/* 탭 */}
      <div className="bg-white px-4 py-2 border-b border-gray-100 flex gap-1">
        {[
          { key: 'home', label: '홈', icon: '🏠' },
          { key: 'growth', label: '성장', icon: '📈' },
          { key: 'schedule', label: '일정', icon: '📅' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab.key ? 'bg-orange-100 text-orange-600' : 'text-gray-500'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <main className="p-4 pb-8">
        {activeTab === 'home' && (
          <>
            {child ? (
              <>
                {/* 자녀 프로필 카드 */}
                <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${
                      child.status === 'active' ? 'bg-emerald-100' :
                      child.status === 'warning' ? 'bg-amber-100' : 'bg-red-100'
                    }`}>🏀</div>
                    <div className="flex-1">
                      <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {child.name}
                        {child.position && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                            {child.position}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{child.class}</div>
                    </div>
                  </div>

                  {/* 핵심 지표 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded-xl p-3 text-center ${
                      child.attendanceRate >= 80 ? 'bg-emerald-50' :
                      child.attendanceRate >= 60 ? 'bg-amber-50' : 'bg-red-50'
                    }`}>
                      <div className={`text-xs ${
                        child.attendanceRate >= 80 ? 'text-emerald-600' :
                        child.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>참여율</div>
                      <div className={`text-2xl font-bold ${
                        child.attendanceRate >= 80 ? 'text-emerald-600' :
                        child.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>{child.attendanceRate}%</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <div className="text-xs text-blue-600">스킬점수</div>
                      <div className="text-2xl font-bold text-blue-600">{child.skillScore || 50}</div>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${
                      child.status === 'active' ? 'bg-emerald-50' :
                      child.status === 'warning' ? 'bg-amber-50' : 'bg-red-50'
                    }`}>
                      <div className={`text-xs ${
                        child.status === 'active' ? 'text-emerald-600' :
                        child.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>상태</div>
                      <div className={`text-lg font-bold ${
                        child.status === 'active' ? 'text-emerald-600' :
                        child.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {child.status === 'active' ? '좋음' : child.status === 'warning' ? '주의' : '관심'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 연속 출석 배너 */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm opacity-80">연속 참여</div>
                      <div className="text-4xl font-bold">{streakDays}일</div>
                    </div>
                    <div className="text-6xl">{streakDays >= 5 ? '🔥' : streakDays >= 3 ? '💪' : '🏀'}</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/20 text-sm">
                    {streakDays >= 5 ? '대단해요! 꾸준히 열심히 하고 있어요!' :
                     streakDays >= 3 ? '좋아요! 계속 화이팅!' : '꾸준함이 실력이에요!'}
                  </div>
                </div>

                {/* 알림 */}
                {child.status === 'warning' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    <div className="flex items-center gap-2 text-amber-700">
                      <span>⚠️</span>
                      <span className="text-sm font-medium">참여율이 조금 낮아지고 있어요. 응원 부탁드려요!</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                <div className="text-4xl mb-3">🏀</div>
                <div className="text-gray-500">등록된 자녀 정보가 없습니다</div>
                <div className="text-sm text-gray-400 mt-2">학원에 문의해주세요</div>
              </div>
            )}
          </>
        )}

        {activeTab === 'growth' && child && (
          <>
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-4 mb-4 text-white">
              <div className="text-sm opacity-80">📈 {child.name}의 성장 기록</div>
              <div className="text-lg font-bold mt-1">꾸준한 훈련이 실력이 됩니다!</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <h3 className="font-medium text-gray-700 mb-3">스킬 발달 현황</h3>
              <div className="space-y-3">
                {[
                  { name: '드리블', score: Math.min(100, (child.skillScore || 50) + 10), color: 'bg-blue-500' },
                  { name: '슈팅', score: child.skillScore || 50, color: 'bg-emerald-500' },
                  { name: '패스', score: Math.min(100, (child.skillScore || 50) - 5), color: 'bg-purple-500' },
                  { name: '체력', score: child.attendanceRate || 70, color: 'bg-orange-500' },
                ].map(skill => (
                  <div key={skill.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{skill.name}</span>
                      <span className="font-medium text-gray-900">{skill.score}점</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${skill.color} rounded-full transition-all`}
                           style={{ width: `${skill.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'schedule' && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="font-medium text-gray-700 mb-3">📅 이번 주 수업</h3>
            {state.classes.length > 0 ? (
              <div className="space-y-2">
                {state.classes.map(cls => (
                  <div key={cls.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900">{cls.name}</div>
                      <div className="text-sm text-gray-500">{cls.time}</div>
                    </div>
                    <span className="text-orange-500">🏀</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-6">
                이번 주 예정된 수업이 없습니다
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// 🚀 메인 앱
// ============================================
export default function AllThatBasket() {
  const { state } = useStore();
  const [hash, setHash] = useState(window.location.hash.toLowerCase());

  // 해시 변경 감지
  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash.toLowerCase());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // #process 해시일 때 ProcessMap 렌더링
  if (hash === '#process') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-orange-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">프로세스 맵 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMap />
      </Suspense>
    );
  }

  // #processv2 해시일 때 모션 기반 ProcessMapV2 렌더링
  if (hash === '#processv2') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">모션 맵 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV2 />
      </Suspense>
    );
  }

  // #processv3 해시일 때 특성 기반 ProcessMapV3 렌더링
  if (hash === '#processv3') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">프로세스 맵 V3 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV3 />
      </Suspense>
    );
  }

  // #processv4 해시일 때 Force 기반 ProcessMapV4 렌더링
  if (hash === '#processv4') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Force Map 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV4 />
      </Suspense>
    );
  }

  // #processv5 해시일 때 고객 & 노드 맵 렌더링
  if (hash === '#processv5') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">고객 맵 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV5 />
      </Suspense>
    );
  }

  // #processv6 해시일 때 진화 맵 렌더링
  if (hash === '#processv6') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">진화 맵 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV6 />
      </Suspense>
    );
  }

  // #processv7 해시일 때 타임테이블 렌더링
  if (hash === '#processv7') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">타임테이블 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV7 />
      </Suspense>
    );
  }

  // #processv8 해시일 때 상태 머신 렌더링
  if (hash === '#processv8') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">상태 머신 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV8 />
      </Suspense>
    );
  }

  // #processv9 해시일 때 Master World Map 렌더링
  if (hash === '#processv9') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">World Map 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV9 />
      </Suspense>
    );
  }

  // #processv10 해시일 때 고객 중심 World Map 렌더링
  if (hash === '#processv10') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">고객 중심 맵 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV10 />
      </Suspense>
    );
  }

  // #decision 해시일 때 Decision Dashboard 렌더링
  if (hash === '#decision') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Decision Dashboard 로딩중...</p>
          </div>
        </div>
      }>
        <DecisionDashboard />
      </Suspense>
    );
  }

  // #hub 해시일 때 Process Hub 렌더링
  if (hash === '#hub') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Process Hub 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessHub />
      </Suspense>
    );
  }

  // #editor 해시일 때 Interactive Node Editor 렌더링
  if (hash === '#editor') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Node Editor 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV11 />
      </Suspense>
    );
  }

  // #flow 해시일 때 Living Flow Graph 렌더링
  if (hash === '#flow') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Living Flow Graph 로딩중...</p>
          </div>
        </div>
      }>
        <ProcessMapV12 />
      </Suspense>
    );
  }

  // #autus 해시일 때 AUTUS Internal Dashboard 렌더링 (내부 전용)
  if (hash === '#autus') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Internal 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSInternal />
      </Suspense>
    );
  }

  // #final 해시일 때 최종본 렌더링
  if (hash === '#final') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-amber-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">최종본 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSFinal />
      </Suspense>
    );
  }

  // #universal 해시일 때 범용 프레임워크 렌더링
  if (hash === '#universal') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">AUTUS Universal 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSUniversal />
      </Suspense>
    );
  }

  // #amazon 해시일 때 아마존 시스템 렌더링
  if (hash === '#amazon') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Amazon System 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSAmazon />
      </Suspense>
    );
  }

  // #decisionos 해시일 때 Decision OS 렌더링
  if (hash === '#decisionos') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Decision OS 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSDecisionOS />
      </Suspense>
    );
  }

  // #factory 해시일 때 AUTUS Factory 렌더링
  if (hash === '#factory') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Factory 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSFactory />
      </Suspense>
    );
  }

  // #core 해시일 때 AUTUS Core Engine 렌더링 (Amazon + Tesla + Palantir 통합)
  if (hash === '#core') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Core Engine 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSCore />
      </Suspense>
    );
  }

  // #live 해시일 때 AUTUS Live Engine 렌더링 (실제 동작 엔진)
  if (hash === '#live') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Live Engine 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSLive />
      </Suspense>
    );
  }

  // #engine 해시일 때 통합 AUTUS 렌더링 (원리 기반 역할별 뷰)
  if (hash === '#engine') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Engine 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUS />
      </Suspense>
    );
  }

  // #blueprint 해시일 때 AUTUS Blueprint 렌더링 (산업-상품-소비자-생산자 프레임워크)
  if (hash === '#blueprint') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Blueprint 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSBlueprint />
      </Suspense>
    );
  }

  // #producer 해시일 때 AUTUS Producer 렌더링 (생산자 앱 생산기)
  if (hash === '#producer') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Producer 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSProducer />
      </Suspense>
    );
  }

  // #moltbot 해시일 때 MoltBot × Claude 상호작용 시스템 렌더링
  if (hash === '#moltbot') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">MoltBot × Claude 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSMoltBot />
      </Suspense>
    );
  }

  // #unified 해시일 때 통합 단일 페이지 렌더링 (5페이지 기능 통합)
  if (hash === '#unified') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">AUTUS Unified 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSUnified />
      </Suspense>
    );
  }

  // #flowtune 해시일 때 FlowTune 실시간 플로우 최적화 대시보드 렌더링
  if (hash === '#flowtune') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8EDF5, #F0F4F8)' }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">FlowTune 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSFlowTune />
      </Suspense>
    );
  }

  // #vfactory 해시일 때 V-Factory Dashboard 렌더링 (Amazon × Tesla × Palantir 원리 기반)
  if (hash === '#vfactory') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">V-Factory 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSVFactory />
      </Suspense>
    );
  }

  // #ops 해시일 때 Operations Dashboard 렌더링 (시범운영 메인)
  if (hash === '#ops') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Operations 로딩중...</p>
          </div>
        </div>
      }>
        <AUTUSOperations />
      </Suspense>
    );
  }

  // #admin 해시일 때 올댓바스켓 관리자 대시보드 (실전 투입용)
  if (hash === '#admin' || hash === '#atb-admin') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">관리자 대시보드 로딩중...</p>
          </div>
        </div>
      }>
        <AdminDashboard />
      </Suspense>
    );
  }

  // #coach 해시일 때 올댓바스켓 코치 대시보드 (실전 투입용)
  if (hash === '#coach' || hash === '#atb-coach') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">코치 대시보드 로딩중...</p>
          </div>
        </div>
      }>
        <CoachDashboard />
      </Suspense>
    );
  }

  // #payment 해시일 때 결제 관리 (최소개발 최대효율)
  if (hash === '#payment' || hash === '#pay') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">결제 관리 로딩중...</p>
          </div>
        </div>
      }>
        <PaymentManager />
      </Suspense>
    );
  }

  // #makeup 해시일 때 보충 신청 페이지 (학부모용)
  if (hash === '#makeup' || hash.startsWith('#makeup?')) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/80">보충 신청 로딩중...</p>
          </div>
        </div>
      }>
        <MakeupRequest />
      </Suspense>
    );
  }

  if (!state.currentRole) return <RoleSelector />;

  switch (state.currentRole) {
    case 'owner': return <OwnerView />;
    case 'admin': return <AdminView />;
    case 'coach': return <CoachView />;
    case 'parent': return <ParentView />;
    default: return <RoleSelector />;
  }
}
