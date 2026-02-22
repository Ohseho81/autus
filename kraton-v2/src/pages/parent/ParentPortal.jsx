/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👨‍👩‍👧 PARENT PORTAL - 학부모 포털
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudents, useEvents, useSupabaseQuery } from '../../hooks/useSupabaseData';

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
  },
  state: {
    1: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: '최고', color: '#22c55e' },
    2: { bg: 'bg-blue-500', text: 'text-blue-400', label: '양호', color: '#3b82f6' },
    3: { bg: 'bg-yellow-500', text: 'text-yellow-400', label: '주의', color: '#eab308' },
    4: { bg: 'bg-orange-500', text: 'text-orange-400', label: '경고', color: '#f97316' },
    5: { bg: 'bg-red-500', text: 'text-red-400', label: '위험', color: '#ef4444' },
    6: { bg: 'bg-red-700', text: 'text-red-300', label: '긴급', color: '#b91c1c' },
  },
};

// ============================================
// SUPABASE DATA HOOK (실데이터 우선, fallback 지원)
// ============================================
function useParentData() {
  const { data: students, isLive } = useStudents({ limit: 1 });
  const { data: eventsRaw } = useEvents({ limit: 10 });
  const { data: paymentsRaw } = useSupabaseQuery('payments', { fallback: [], limit: 5, order: { column: 'created_at', ascending: false } });
  const { data: consultationsRaw } = useSupabaseQuery('consultations', { fallback: [], limit: 5, order: { column: 'created_at', ascending: false } });

  // 첫 번째 학생을 "내 아이"로 사용 (실서비스에서는 auth 기반 필터)
  const student = students?.[0];

  const child = student ? {
    id: student.id,
    name: student.name,
    grade: student.grade || '미지정',
    school: student.school || '',
    class: student.position || '',
    currentState: student.stateLabel?.state || 2,
    vIndex: student.vIndex || 847,
    avatar: '👨‍🎓',
    teacher: '코치',
    subjects: ['배구'],
  } : FALLBACK_CHILD;

  const recentActivity = (eventsRaw || []).slice(0, 4).map(e => ({
    date: e.occurred_at ? timeAgo(e.occurred_at) : '',
    action: e.event_type?.split('.').pop()?.replace(/_/g, ' ') || '활동',
    detail: e.event_category || '',
    icon: e.event_type?.includes('attendance') ? '✅' : e.event_type?.includes('payment') ? '💳' : '📝',
  }));

  const payments = paymentsRaw?.length > 0 ? paymentsRaw.map(p => ({
    id: p.id,
    month: p.billing_month || '',
    amount: p.amount || 0,
    status: p.status || 'pending',
    paidAt: p.paid_at,
    dueDate: p.due_date,
  })) : FALLBACK_PAYMENTS;

  const consultations = consultationsRaw?.length > 0 ? consultationsRaw.map(c => ({
    id: c.id,
    date: c.scheduled_at || c.created_at,
    teacher: c.counselor_name || '코치',
    topic: c.topic || c.type || '상담',
    status: c.status || 'scheduled',
  })) : FALLBACK_CONSULTATIONS;

  return { child, recentActivity, payments, consultations, isLive };
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  return `${days}일 전`;
}

// FALLBACK DATA (Supabase 미연결 시)
const FALLBACK_CHILD = {
  id: 'STU001', name: '김민수', grade: '고2', school: '서울고등학교', class: 'A반',
  currentState: 2, vIndex: 847, avatar: '👨‍🎓', teacher: '박선생님', subjects: ['국어', '영어', '수학'],
};

const FALLBACK_PAYMENTS = [
  { id: 'PAY001', month: '2024년 1월', amount: 450000, status: 'paid', paidAt: '2024-01-05' },
  { id: 'PAY002', month: '2024년 2월', amount: 450000, status: 'pending', dueDate: '2024-02-05' },
];

const FALLBACK_CONSULTATIONS = [
  { id: 'CON001', date: '2024-01-15', teacher: '박선생님', topic: '학습 상담', status: 'completed' },
  { id: 'CON002', date: '2024-02-01', teacher: '박선생님', topic: '진로 상담', status: 'scheduled' },
];

// ============================================
// CHILD STATUS CARD
// ============================================
const ChildStatusCard = memo(function ChildStatusCard({ child }) {
  const stateConfig = TOKENS.state[child.currentState];
  
  return (
    <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center gap-6">
        {/* Avatar */}
        <div className="relative">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
            style={{ backgroundColor: `${stateConfig.color}20` }}
          >
            {child.avatar}
          </div>
          <div 
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: stateConfig.color }}
          >
            {child.currentState}
          </div>
        </div>
        
        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{child.name}</h2>
            <span 
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${stateConfig.color}20`, color: stateConfig.color }}
            >
              State {child.currentState} · {stateConfig.label}
            </span>
          </div>
          <p className="text-gray-400 mt-1">{child.school} · {child.grade} · {child.class}</p>
          <p className="text-gray-500 text-sm mt-2">담당: {child.teacher}</p>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4">
          {[
            { label: 'V-Index', value: child.vIndex, trend: '+52', color: 'purple' },
            { label: '출석률', value: '98%', trend: '', color: 'emerald' },
            { label: '평균점수', value: '87', trend: '+5', color: 'cyan' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center px-4 py-3 bg-gray-800/50 rounded-xl">
              <p className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</p>
              {stat.trend && (
                <span className="text-emerald-400 text-xs">↑ {stat.trend}</span>
              )}
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// RECENT ACTIVITY
// ============================================
const RecentActivity = memo(function RecentActivity({ activities }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h3 className={`${TOKENS.type.h2} text-white mb-4`}>📋 최근 활동</h3>
      
      <div className="space-y-3">
        {activities.map((act, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl">
            <span className="text-2xl">{act.icon}</span>
            <div className="flex-1">
              <p className="text-white font-medium">{act.action}</p>
              <p className="text-gray-500 text-sm">{act.detail}</p>
            </div>
            <span className="text-gray-500 text-xs">{act.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// PAYMENT SECTION
// ============================================
const PaymentSection = memo(function PaymentSection({ payments }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${TOKENS.type.h2} text-white`}>💳 결제 내역</h3>
        <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
          전체 보기 →
        </button>
      </div>
      
      <div className="space-y-3">
        {payments.map((payment) => (
          <div 
            key={payment.id}
            className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/50"
          >
            <div>
              <p className="text-white font-medium">{payment.month}</p>
              <p className="text-gray-500 text-sm">
                {payment.status === 'paid' 
                  ? `결제일: ${payment.paidAt}` 
                  : `마감일: ${payment.dueDate}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">{payment.amount.toLocaleString()}원</p>
              {payment.status === 'paid' ? (
                <span className="text-emerald-400 text-sm">✓ 결제 완료</span>
              ) : (
                <button className="mt-1 px-4 py-1 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-600 transition-colors">
                  결제하기
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// CONSULTATION SECTION
// ============================================
const ConsultationSection = memo(function ConsultationSection({ consultations, onRequestNew }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${TOKENS.type.h2} text-white`}>📅 상담</h3>
        <button 
          onClick={onRequestNew}
          className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors"
        >
          + 상담 신청
        </button>
      </div>
      
      <div className="space-y-3">
        {consultations.map((consult) => (
          <div 
            key={consult.id}
            className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {consult.status === 'completed' ? '✅' : '📆'}
              </span>
              <div>
                <p className="text-white font-medium">{consult.topic}</p>
                <p className="text-gray-500 text-sm">{consult.teacher} · {consult.date}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              consult.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {consult.status === 'completed' ? '완료' : '예정'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// QUICK ACTIONS
// ============================================
const QuickActions = memo(function QuickActions() {
  const actions = [
    { icon: '📱', label: '담당 선생님 연락', color: 'cyan' },
    { icon: '📝', label: '건의사항 작성', color: 'purple' },
    { icon: '📄', label: '증명서 발급', color: 'blue' },
    { icon: '🔔', label: '알림 설정', color: 'orange' },
  ];
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h3 className={`${TOKENS.type.h2} text-white mb-4`}>⚡ 빠른 메뉴</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, idx) => (
          <button
            key={idx}
            className={`flex items-center gap-3 p-4 rounded-xl bg-${action.color}-500/10 text-${action.color}-400 hover:bg-${action.color}-500/20 transition-colors`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="font-medium text-sm">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

// ============================================
// CONSULTATION REQUEST MODAL
// ============================================
const ConsultationModal = memo(function ConsultationModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    topic: '',
    preferredDate: '',
    preferredTime: '',
    message: '',
  });
  
  if (!isOpen) return null;
  
  const handleSubmit = () => {
    onSubmit(form);
    onClose();
    setForm({ topic: '', preferredDate: '', preferredTime: '', message: '' });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700"
      >
        <h3 className="text-xl font-bold text-white mb-4">📅 상담 신청</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">상담 유형</label>
            <select
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="">선택하세요</option>
              <option value="학습상담">학습 상담</option>
              <option value="진로상담">진로 상담</option>
              <option value="생활상담">생활 상담</option>
              <option value="기타">기타</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">희망 날짜</label>
              <input
                type="date"
                value={form.preferredDate}
                onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">희망 시간</label>
              <select
                value={form.preferredTime}
                onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="">선택</option>
                <option value="14:00">오후 2시</option>
                <option value="15:00">오후 3시</option>
                <option value="16:00">오후 4시</option>
                <option value="17:00">오후 5시</option>
                <option value="18:00">오후 6시</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">상담 내용</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="상담하고 싶은 내용을 적어주세요"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            신청하기
          </button>
        </div>
      </motion.div>
    </div>
  );
});

// ============================================
// MAIN PARENT PORTAL
// ============================================
export default function ParentPortal() {
  const [showConsultModal, setShowConsultModal] = useState(false);
  const { child, recentActivity, payments, consultations, isLive } = useParentData();

  const handleConsultationSubmit = (data) => {
    console.log('Consultation request:', data);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white`}>👨‍👩‍👧 학부모 포털</h1>
          <p className="text-gray-500 mt-1">자녀의 학습 현황을 확인하세요</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-sm">환영합니다</p>
          <p className="text-white font-medium">{child.name} 학부모님</p>
          {isLive && <p className="text-emerald-500/60 text-xs">🟢 LIVE</p>}
        </div>
      </div>

      {/* Child Status */}
      <ChildStatusCard child={child} />

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-6">
          <RecentActivity activities={recentActivity.length > 0 ? recentActivity : [
            { date: '오늘', action: '출석', detail: '정상 출석', icon: '✅' },
          ]} />
          <PaymentSection payments={payments} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ConsultationSection
            consultations={consultations}
            onRequestNew={() => setShowConsultModal(true)}
          />
          <QuickActions />
        </div>
      </div>
      
      {/* Consultation Modal */}
      <ConsultationModal
        isOpen={showConsultModal}
        onClose={() => setShowConsultModal(false)}
        onSubmit={handleConsultationSubmit}
      />
    </div>
  );
}
