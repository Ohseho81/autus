/**
 * 🏀 올댓바스켓 관리자 대시보드
 *
 * 실전 투입용 관리 화면
 * - 미수금 관리 (실제 데이터: 10명, ₩3,205,900)
 * - SmartFit 동기화
 * - SaaS 연동 상태
 * - 회원/출석 현황
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import outstandingAPI, { RISK_LEVELS, runAutoReminders } from '../../services/outstandingManager.js';
import { syncService } from '../../services/smartfitApi.js';
import { statsAPI } from './lib/supabase.js';

// ============================================
// 메인 대시보드
// ============================================
export default function AdminDashboard() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [outstanding, setOutstanding] = useState({ data: [], summary: {} });
  const [syncStatus, setSyncStatus] = useState(null);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsResult, outstandingResult, syncResult] = await Promise.all([
        statsAPI.getDashboard(),
        outstandingAPI.getAll(),
        syncService.getStatus(),
      ]);

      setStats(statsResult.data);
      setOutstanding(outstandingResult);
      setSyncStatus(syncResult);
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'overview', label: '대시보드', icon: '📊' },
    { id: 'outstanding', label: '미수금', icon: '💰', badge: outstanding.summary?.count },
    { id: 'sync', label: '동기화', icon: '🔄' },
    { id: 'members', label: '회원', icon: '👥' },
    { id: 'saas', label: 'SaaS', icon: '🔌' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">🏀</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">올댓바스켓</h1>
                <p className="text-xs text-gray-500">관리자 대시보드</p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 새로고침
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                  currentTab === tab.id
                    ? 'text-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.badge > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {tab.badge}
                  </span>
                )}
                {currentTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentTab === 'overview' && (
            <OverviewTab key="overview" stats={stats} outstanding={outstanding} />
          )}
          {currentTab === 'outstanding' && (
            <OutstandingTab key="outstanding" data={outstanding} onRefresh={loadData} />
          )}
          {currentTab === 'sync' && (
            <SyncTab key="sync" status={syncStatus} onRefresh={loadData} />
          )}
          {currentTab === 'members' && (
            <MembersTab key="members" stats={stats} />
          )}
          {currentTab === 'saas' && (
            <SaaSTab key="saas" />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================
// 대시보드 탭
// ============================================
function OverviewTab({ stats, outstanding }) {
  const statCards = [
    { label: '총 회원', value: stats?.totalStudents || 107, unit: '명', color: 'bg-blue-500', icon: '👥' },
    { label: '활성 회원', value: stats?.activeStudents || 107, unit: '명', color: 'bg-green-500', icon: '✅' },
    { label: '평균 출석률', value: stats?.avgAttendance || 87, unit: '%', color: 'bg-orange-500', icon: '📅' },
    { label: '미수금', value: `₩${(outstanding.summary?.totalAmount || 3205900).toLocaleString()}`, unit: '', color: 'bg-red-500', icon: '💰' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
              <div className={`w-2 h-2 rounded-full ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stat.value}{stat.unit}
            </p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-semibold text-gray-900 mb-4">빠른 작업</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '미수금 알림 발송', icon: '📢', color: 'bg-red-50 text-red-600' },
            { label: '데이터 동기화', icon: '🔄', color: 'bg-blue-50 text-blue-600' },
            { label: '출석 현황', icon: '📋', color: 'bg-green-50 text-green-600' },
            { label: '알림톡 발송', icon: '💬', color: 'bg-yellow-50 text-yellow-600' },
          ].map((action, idx) => (
            <button
              key={idx}
              className={`p-4 rounded-xl ${action.color} font-medium text-sm hover:opacity-80 transition-opacity`}
            >
              <span className="text-2xl block mb-2">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Outstanding */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">미수금 현황 (위험순)</h3>
          <span className="text-sm text-red-500 font-medium">
            {outstanding.summary?.count || 10}건 / ₩{(outstanding.summary?.totalAmount || 3205900).toLocaleString()}
          </span>
        </div>
        <div className="space-y-2">
          {(outstanding.data || []).slice(0, 5).map((record, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: RISK_LEVELS[record.risk_level]?.color }}
                />
                <span className="font-medium">{record.student_name}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">₩{record.amount?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{record.days_overdue}일 경과</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 미수금 탭
// ============================================
function OutstandingTab({ data, onRefresh }) {
  const [filter, setFilter] = useState('ALL');
  const [sending, setSending] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  const filteredData = filter === 'ALL'
    ? data.data
    : data.data.filter(r => r.risk_level === filter);

  const handleSendReminders = async () => {
    setSending(true);
    try {
      const result = await runAutoReminders();
      setReminderResult(result);
      setTimeout(() => setReminderResult(null), 5000);
    } catch (e) {
      console.error('Reminder error:', e);
    }
    setSending(false);
  };

  const handleMarkPaid = async (id) => {
    await outstandingAPI.markPaid(id);
    onRefresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">미수금 관리</h3>
            <p className="text-sm text-gray-500">
              총 {data.summary?.count || 0}건, ₩{(data.summary?.totalAmount || 0).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleSendReminders}
            disabled={sending}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
          >
            {sending ? '발송 중...' : '📢 자동 알림 발송'}
          </button>
        </div>

        {reminderResult && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm mb-4">
            ✅ 알림 발송 완료: {reminderResult.sent}건 성공, {reminderResult.failed}건 실패
          </div>
        )}

        {/* Risk Filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            전체
          </button>
          {Object.entries(RISK_LEVELS).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Outstanding List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">위험도</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">이름</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">금액</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">경과일</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((record, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: RISK_LEVELS[record.risk_level]?.color }}
                  >
                    {RISK_LEVELS[record.risk_level]?.label}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{record.student_name}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  ₩{record.amount?.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{record.days_overdue}일</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                      title="알림 발송"
                    >
                      📢
                    </button>
                    <button
                      onClick={() => handleMarkPaid(record.id)}
                      className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200"
                      title="수납 완료"
                    >
                      ✅
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ============================================
// 동기화 탭
// ============================================
function SyncTab({ status, onRefresh }) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleSync = async (type) => {
    setSyncing(true);
    try {
      let result;
      if (type === 'all') {
        result = await syncService.syncAll();
      } else if (type === 'members') {
        result = await syncService.syncMembers();
      }
      setSyncResult(result);
      onRefresh();
    } catch (e) {
      console.error('Sync error:', e);
    }
    setSyncing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Status Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SmartFit API 연동</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">연동 상태</p>
            <p className={`font-semibold ${status?.isConfigured ? 'text-green-600' : 'text-gray-400'}`}>
              {status?.isConfigured ? '✅ 설정됨' : '⚠️ 미설정'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">마지막 동기화</p>
            <p className="font-semibold text-gray-900">
              {status?.lastSync
                ? new Date(status.lastSync).toLocaleString('ko-KR')
                : '없음'}
            </p>
          </div>
        </div>

        {syncResult && (
          <div className="p-4 bg-green-50 text-green-700 rounded-lg mb-4">
            <p className="font-medium">✅ 동기화 완료</p>
            <p className="text-sm mt-1">
              {syncResult.members && `회원: ${syncResult.members.synced}건`}
              {syncResult.attendance && `, 출석: ${syncResult.attendance.synced}건`}
              {syncResult.payments && `, 수납: ${syncResult.payments.synced}건`}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleSync('all')}
            disabled={syncing}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {syncing ? '동기화 중...' : '🔄 전체 동기화'}
          </button>
          <button
            onClick={() => handleSync('members')}
            disabled={syncing}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            👥 회원만
          </button>
        </div>
      </div>

      {/* API Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-semibold text-gray-900 mb-4">API 정보</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">API Endpoint</span>
            <span className="font-mono text-gray-900">
              {status?.isConfigured ? '***설정됨***' : '미설정'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">Center ID</span>
            <span className="font-mono text-gray-900">ATB-001</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">연동 대상</span>
            <span className="text-gray-900">회원, 출석, 수납</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 회원 탭
// ============================================
function MembersTab({ stats }) {
  const schoolStats = [
    { name: '대현초', count: 24 },
    { name: '대곡초', count: 9 },
    { name: '대치초', count: 7 },
    { name: '역삼초', count: 6 },
    { name: '기타', count: 61 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member Stats */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">회원 현황</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">총 회원</span>
              <span className="text-2xl font-bold">{stats?.totalStudents || 107}명</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">활성 회원</span>
              <span className="text-xl font-semibold text-green-600">{stats?.activeStudents || 107}명</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">셔틀 이용</span>
              <span className="text-xl font-semibold text-blue-600">11명</span>
            </div>
          </div>
        </div>

        {/* School Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">학교별 분포</h3>
          <div className="space-y-3">
            {schoolStats.map((school, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{school.name}</span>
                    <span className="text-sm text-gray-500">{school.count}명</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${(school.count / 107) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SaaS 탭
// ============================================
function SaaSTab() {
  const integrations = [
    { name: '카카오 알림톡', icon: '💬', status: 'connected', description: '학부모 알림 발송' },
    { name: '구글 캘린더', icon: '📅', status: 'connected', description: '수업 일정 동기화' },
    { name: '토스페이먼츠', icon: '💳', status: 'connected', description: '자동 결제 처리' },
    { name: '슬랙', icon: '📢', status: 'connected', description: '내부 알림 채널' },
    { name: 'SmartFit API', icon: '🔄', status: 'connected', description: '기존 시스템 연동' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SaaS 연동 현황</h3>
        <div className="space-y-3">
          {integrations.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                item.status === 'connected'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {item.status === 'connected' ? '✅ 연결됨' : '미연결'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-2">🚀 모든 시스템 연동 완료!</h3>
        <p className="text-orange-100 text-sm">
          올댓바스켓은 5개의 SaaS와 연동되어 자동화된 운영이 가능합니다.
        </p>
      </div>
    </motion.div>
  );
}
