/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 EXTERNAL PORTAL - Service for External Users
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 외부 이용 주체 3개:
 * 1. Primary Service Consumer (고객/학생) - 95% 자동화
 * 2. Regulatory Participant (정부/규제) - 80% 자동화
 * 3. Partner Collaborator (공급자/파트너) - 90% 자동화
 */

import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    h3: 'text-lg font-medium',
  },
};

// ============================================
// MOCK DATA
// ============================================
const MOCK_CONSUMER_DATA = {
  user: { name: '김민준', type: 'student', vIndex: 82, state: 'T2' },
  dashboard: {
    attendance: { rate: 94, streak: 12 },
    performance: { score: 87, trend: 'up', change: +5 },
    rewards: { points: 2340, redeemable: 3 },
  },
  recentActivities: [
    { id: 1, type: 'class', title: '수학 A반 수업 완료', timestamp: '2시간 전', vChange: +12 },
    { id: 2, type: 'quiz', title: '주간 테스트 90점', timestamp: '1일 전', vChange: +25 },
    { id: 3, type: 'streak', title: '10일 연속 출석 달성', timestamp: '2일 전', vChange: +50 },
  ],
  recommendations: [
    { id: 1, type: 'course', title: '수학 심화반 추천', reason: '최근 성적 향상' },
    { id: 2, type: 'event', title: '토요 특강 참여', reason: '관심 분야 매칭' },
  ],
  churnRisk: { level: 'low', score: 15, engagement: 'high' },
};

const MOCK_REGULATORY_DATA = {
  organization: '교육부 관할 지역교육청',
  permits: [
    { id: 1, name: '학원 등록증', status: 'valid', expiry: '2025-12-31', autoRenewal: true },
    { id: 2, name: '방화 안전 인증', status: 'valid', expiry: '2024-06-30', autoRenewal: true },
    { id: 3, name: '위생 점검 확인서', status: 'pending', expiry: null, autoRenewal: false },
  ],
  complianceScore: 94,
  reports: [
    { id: 1, name: '분기별 학생 현황 보고서', status: 'submitted', date: '2024-01-10' },
    { id: 2, name: '안전 관리 계획서', status: 'draft', date: null },
  ],
  audits: [
    { id: 1, type: '정기 감사', date: '2024-03-15', status: 'scheduled' },
  ],
  regulations: [
    { id: 1, title: '학원법 개정 (2024.01)', impact: 'medium', status: 'compliant' },
    { id: 2, title: '개인정보보호법 강화', impact: 'high', status: 'action_needed' },
  ],
};

const MOCK_PARTNER_DATA = {
  partner: { name: '교재 출판사 A', type: 'supplier', since: '2022-05' },
  orders: [
    { id: 1, item: '수학 교재 세트', qty: 50, status: 'delivered', date: '2024-01-08' },
    { id: 2, item: '영어 워크북', qty: 30, status: 'in_transit', eta: '2024-01-15' },
    { id: 3, item: '과학 실험 키트', qty: 20, status: 'pending', eta: '2024-01-20' },
  ],
  performance: {
    vScore: 78,
    onTimeDelivery: 96,
    qualityScore: 92,
    partnershipLevel: 'Gold',
  },
  sharedMetrics: {
    totalOrders: 234,
    totalValue: 4500,
    avgLeadTime: 3.2,
  },
  alerts: [
    { id: 1, type: 'delay', message: '영어 워크북 배송 1일 지연 예상', severity: 'low' },
  ],
};

// ============================================
// PRIMARY SERVICE CONSUMER PORTAL
// ============================================
const ConsumerPortal = memo(function ConsumerPortal({ data }) {
  const getStateColor = (state) => {
    const colors = {
      T1: 'text-yellow-400 bg-yellow-500/20',
      T2: 'text-cyan-400 bg-cyan-500/20',
      T3: 'text-emerald-400 bg-emerald-500/20',
      T4: 'text-gray-400 bg-gray-500/20',
    };
    return colors[state] || colors.T4;
  };
  
  return (
    <div className="space-y-6">
      {/* User Header */}
      <div className="bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-emerald-500/20 rounded-3xl p-6 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-2xl flex items-center justify-center text-2xl">
              👩‍🎓
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{data.user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStateColor(data.user.state)}`}>
                  {data.user.state}
                </span>
                <span className="text-gray-400 text-sm">V-Index: {data.user.vIndex}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-white">{data.user.vIndex}</p>
            <p className="text-cyan-400 text-sm">🌀 V-나선 점수</p>
          </div>
        </div>
      </div>
      
      {/* Dashboard Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-2">📅 출석률</p>
          <p className="text-3xl font-bold text-white">{data.dashboard.attendance.rate}%</p>
          <p className="text-emerald-400 text-sm">🔥 {data.dashboard.attendance.streak}일 연속</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-2">📊 성적</p>
          <p className="text-3xl font-bold text-white">{data.dashboard.performance.score}</p>
          <p className="text-emerald-400 text-sm">↑ +{data.dashboard.performance.change}점</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-2">🎁 포인트</p>
          <p className="text-3xl font-bold text-white">{data.dashboard.rewards.points.toLocaleString()}</p>
          <p className="text-cyan-400 text-sm">{data.dashboard.rewards.redeemable}개 교환 가능</p>
        </div>
      </div>
      
      {/* Recent Activities */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-medium text-white mb-4">📋 최근 활동</h3>
        <div className="space-y-3">
          {data.recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <div>
                <p className="text-white">{activity.title}</p>
                <p className="text-gray-500 text-sm">{activity.timestamp}</p>
              </div>
              <span className="text-emerald-400 font-medium">+{activity.vChange} V</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* AI Recommendations */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-6 border border-cyan-500/20">
        <h3 className="text-lg font-medium text-white mb-4">🤖 AI 추천</h3>
        <div className="grid grid-cols-2 gap-3">
          {data.recommendations.map((rec) => (
            <div key={rec.id} className="p-4 bg-gray-900/50 rounded-xl">
              <p className="text-white font-medium">{rec.title}</p>
              <p className="text-gray-500 text-sm mt-1">{rec.reason}</p>
              <button className="mt-2 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30">
                자세히 보기
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// REGULATORY PARTICIPANT PORTAL
// ============================================
const RegulatoryPortal = memo(function RegulatoryPortal({ data }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'valid': return 'bg-emerald-500/20 text-emerald-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'expired': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-700 text-gray-400';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl p-6 border border-red-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">🏛️ Regulatory Portal</h2>
            <p className="text-gray-400 mt-1">{data.organization}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Compliance Score</p>
            <p className={`text-4xl font-bold ${data.complianceScore >= 90 ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {data.complianceScore}%
            </p>
          </div>
        </div>
      </div>
      
      {/* Permits & Licenses */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-medium text-white mb-4">📜 허가 및 인증</h3>
        <div className="space-y-3">
          {data.permits.map((permit) => (
            <div key={permit.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <div>
                <p className="text-white">{permit.name}</p>
                {permit.expiry && (
                  <p className="text-gray-500 text-sm">만료: {permit.expiry}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {permit.autoRenewal && (
                  <span className="text-xs text-cyan-400">🔄 자동 갱신</span>
                )}
                <span className={`px-2 py-1 rounded text-xs ${getStatusStyle(permit.status)}`}>
                  {permit.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Reports */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-medium text-white mb-4">📊 자동 생성 보고서</h3>
          <div className="space-y-2">
            {data.reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                <span className="text-white text-sm">{report.name}</span>
                <span className={`text-xs ${report.status === 'submitted' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {report.status === 'submitted' ? '✓ 제출됨' : '⏳ 작성 중'}
                </span>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30">
            새 보고서 생성
          </button>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-medium text-white mb-4">⚖️ 규제 변화 알림</h3>
          <div className="space-y-2">
            {data.regulations.map((reg) => (
              <div key={reg.id} className="p-3 bg-gray-900/30 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm">{reg.title}</span>
                  <span className={`text-xs ${reg.impact === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {reg.impact} impact
                  </span>
                </div>
                <span className={`text-xs ${reg.status === 'compliant' ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {reg.status === 'compliant' ? '✓ 준수 중' : '⚠️ 조치 필요'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Upcoming Audits */}
      {data.audits.length > 0 && (
        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-400 font-medium">📋 예정된 감사</p>
              <p className="text-white">{data.audits[0].type} - {data.audits[0].date}</p>
            </div>
            <button className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30">
              자료 자동 준비
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================
// PARTNER COLLABORATOR PORTAL
// ============================================
const PartnerPortal = memo(function PartnerPortal({ data }) {
  const getOrderStatus = (status) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-500/20 text-emerald-400';
      case 'in_transit': return 'bg-cyan-500/20 text-cyan-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-700 text-gray-400';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-3xl p-6 border border-orange-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-2xl flex items-center justify-center text-2xl">
              🤝
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{data.partner.name}</h2>
              <p className="text-gray-400">{data.partner.type} · Since {data.partner.since}</p>
            </div>
          </div>
          <div className="text-center px-6 py-3 bg-yellow-500/20 rounded-xl">
            <p className="text-yellow-400 font-bold">{data.performance.partnershipLevel}</p>
            <p className="text-xs text-gray-400">Partner Level</p>
          </div>
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
          <p className="text-gray-400 text-sm">V Score</p>
          <p className="text-2xl font-bold text-cyan-400">{data.performance.vScore}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
          <p className="text-gray-400 text-sm">정시 배송률</p>
          <p className="text-2xl font-bold text-emerald-400">{data.performance.onTimeDelivery}%</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
          <p className="text-gray-400 text-sm">품질 점수</p>
          <p className="text-2xl font-bold text-white">{data.performance.qualityScore}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
          <p className="text-gray-400 text-sm">평균 리드타임</p>
          <p className="text-2xl font-bold text-white">{data.sharedMetrics.avgLeadTime}일</p>
        </div>
      </div>
      
      {/* Orders */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">📦 주문 현황</h3>
          <button className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm">
            + 새 주문
          </button>
        </div>
        <div className="space-y-3">
          {data.orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <div>
                <p className="text-white">{order.item}</p>
                <p className="text-gray-500 text-sm">수량: {order.qty}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs ${getOrderStatus(order.status)}`}>
                  {order.status === 'delivered' ? '✓ 배송완료' : 
                   order.status === 'in_transit' ? '🚚 배송중' : '⏳ 대기'}
                </span>
                {order.eta && order.status !== 'delivered' && (
                  <p className="text-gray-500 text-xs mt-1">ETA: {order.eta}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
          {data.alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between">
              <p className="text-orange-400">⚠️ {alert.message}</p>
              <span className={`text-xs ${alert.severity === 'low' ? 'text-yellow-400' : 'text-red-400'}`}>
                {alert.severity}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Shared Dashboard */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-medium text-white mb-4">📊 공유 대시보드</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-900/50 rounded-xl">
            <p className="text-gray-400 text-sm">총 주문</p>
            <p className="text-2xl font-bold text-white">{data.sharedMetrics.totalOrders}</p>
          </div>
          <div className="text-center p-4 bg-gray-900/50 rounded-xl">
            <p className="text-gray-400 text-sm">총 거래액</p>
            <p className="text-2xl font-bold text-white">{data.sharedMetrics.totalValue}M₩</p>
          </div>
          <div className="text-center p-4 bg-gray-900/50 rounded-xl">
            <p className="text-gray-400 text-sm">협력 추천</p>
            <p className="text-lg font-bold text-cyan-400">신규 교재 출시 협력</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================
// MAIN EXTERNAL PORTAL
// ============================================
export default function ExternalPortal() {
  const [activePortal, setActivePortal] = useState('consumer');
  
  const portals = [
    { id: 'consumer', label: '고객/학생', icon: '👩‍🎓', automation: 95, color: 'purple' },
    { id: 'regulatory', label: '규제/정부', icon: '🏛️', automation: 80, color: 'red' },
    { id: 'partner', label: '파트너/공급자', icon: '🤝', automation: 90, color: 'orange' },
  ];
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white flex items-center gap-3`}>
            <span className="text-4xl">🌐</span>
            External Portal
          </h1>
          <p className="text-gray-400 mt-1">외부 이용 주체 서비스</p>
        </div>
      </div>
      
      {/* Portal Selector */}
      <div className="flex gap-3">
        {portals.map((portal) => (
          <button
            key={portal.id}
            onClick={() => setActivePortal(portal.id)}
            className={`flex-1 p-4 rounded-xl border transition-all ${
              activePortal === portal.id
                ? `bg-${portal.color}-500/20 border-${portal.color}-500/50 text-${portal.color}-400`
                : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{portal.icon}</span>
                <div className="text-left">
                  <p className={`font-medium ${activePortal === portal.id ? `text-${portal.color}-400` : 'text-white'}`}>
                    {portal.label}
                  </p>
                  <p className="text-xs text-gray-500">{portal.automation}% 자동화</p>
                </div>
              </div>
              {activePortal === portal.id && (
                <span className={`px-2 py-1 rounded text-xs bg-${portal.color}-500/30`}>
                  Active
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* Portal Content */}
      <motion.div
        key={activePortal}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activePortal === 'consumer' && <ConsumerPortal data={MOCK_CONSUMER_DATA} />}
        {activePortal === 'regulatory' && <RegulatoryPortal data={MOCK_REGULATORY_DATA} />}
        {activePortal === 'partner' && <PartnerPortal data={MOCK_PARTNER_DATA} />}
      </motion.div>
      
      {/* Integration Status */}
      <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">V-Engine 연동</p>
            <p className="text-lg font-bold text-emerald-400">Active</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">자동화 상태</p>
            <p className="text-lg font-bold text-cyan-400">Running</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">마지막 동기화</p>
            <p className="text-lg font-bold text-white">2분 전</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">
            설정
          </button>
          <button className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
            ⚡ Optimus 연결
          </button>
        </div>
      </div>
    </div>
  );
}
