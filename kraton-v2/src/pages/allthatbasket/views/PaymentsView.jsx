/**
 * 🏀 올댓바스켓 - 수납 관리 뷰
 * 수납현황, 미수금, 개인일별매출 추적
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, AlertTriangle, Check, Clock, X,
  TrendingUp, TrendingDown, Calendar, Download,
  Filter, Search, ChevronRight, DollarSign
} from 'lucide-react';

// ============================================
// 수납 상태 배지
// ============================================
const PaymentStatusBadge = ({ status }) => {
  const config = {
    paid: { label: '완납', bg: 'bg-green-500/20', text: 'text-green-400', icon: Check },
    partial: { label: '부분납', bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
    overdue: { label: '미납', bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertTriangle },
    pending: { label: '대기', bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Clock },
  };

  const { label, bg, text, icon: Icon } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${bg} ${text}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

// ============================================
// 학생 수납 카드
// ============================================
const StudentPaymentCard = ({ student, onPayment, onOutstanding }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      className="p-4 rounded-xl bg-white/3 border border-white/8 hover:border-white/15 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* 학생 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{student.name}</span>
            <PaymentStatusBadge status={student.payment_status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {student.class_name} • {student.grade}
          </p>
        </div>

        {/* 금액 정보 */}
        <div className="text-right">
          <p className="text-xs text-gray-500">월 수업료</p>
          <p className="text-white font-medium">{student.monthly_fee?.toLocaleString()}원</p>
        </div>

        {/* 미수금 */}
        <div className="text-right min-w-[80px]">
          <p className="text-xs text-gray-500">미수금</p>
          <p className={`font-bold ${student.total_outstanding > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {student.total_outstanding?.toLocaleString() || 0}원
          </p>
        </div>

        {/* 액션 버튼 */}
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <ChevronRight
            size={18}
            className={`text-gray-400 transition-transform ${showActions ? 'rotate-90' : ''}`}
          />
        </button>
      </div>

      {/* 액션 패널 */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => onPayment(student)}
                className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30 flex items-center justify-center gap-1"
              >
                <CreditCard size={14} />
                수납 처리
              </button>
              {student.total_outstanding > 0 && (
                <button
                  onClick={() => onOutstanding(student)}
                  className="flex-1 py-2 rounded-lg bg-orange-500/20 text-orange-400 text-sm hover:bg-orange-500/30 flex items-center justify-center gap-1"
                >
                  <DollarSign size={14} />
                  미수금 납부
                </button>
              )}
              <button className="py-2 px-4 rounded-lg bg-white/10 text-gray-400 text-sm hover:bg-white/15">
                상세
              </button>
            </div>

            {/* 최근 수납 내역 */}
            <div className="mt-3 p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-500 mb-2">일별 매출 누적</p>
              <p className="text-lg font-bold text-cyan-400">
                {student.total_daily_revenue?.toLocaleString() || 0}원
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================
// 수납 처리 모달
// ============================================
const PaymentModal = ({ student, onClose, onConfirm }) => {
  const [amount, setAmount] = useState(student?.monthly_fee || 0);
  const [method, setMethod] = useState('card');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const methods = [
    { id: 'card', label: '카드' },
    { id: 'cash', label: '현금' },
    { id: 'transfer', label: '계좌이체' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#1A1A2E' }}
      >
        <h3 className="text-lg font-bold text-white mb-4">수납 처리</h3>

        <div className="space-y-4">
          {/* 학생 정보 */}
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{student?.name}</p>
            <p className="text-xs text-gray-500">{student?.class_name}</p>
          </div>

          {/* 수납월 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">수납월</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white"
            />
          </div>

          {/* 금액 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">금액</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-lg font-bold"
            />
            <p className="text-xs text-gray-500 mt-1">
              월 수업료: {student?.monthly_fee?.toLocaleString()}원
            </p>
          </div>

          {/* 결제 방법 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">결제 방법</label>
            <div className="flex gap-2">
              {methods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                    method === m.id
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500'
                      : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/10 text-gray-400 font-medium"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm({ studentId: student.id, amount, method, month })}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-medium"
          >
            수납 완료
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// 메인 컴포넌트
// ============================================
export default function PaymentsView({ data }) {
  const { students, recordPayment, getStudentsWithOutstanding, getTotalOutstanding } = data;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(null);

  // 통계
  const stats = useMemo(() => {
    const total = students.length;
    const paid = students.filter(s => s.payment_status === 'paid').length;
    const partial = students.filter(s => s.payment_status === 'partial').length;
    const overdue = students.filter(s => s.payment_status === 'overdue').length;
    const totalOutstanding = getTotalOutstanding();
    const monthlyRevenue = students.reduce((sum, s) => sum + (s.monthly_fee || 0), 0);
    const collectedRevenue = students
      .filter(s => s.payment_status === 'paid')
      .reduce((sum, s) => sum + (s.monthly_fee || 0), 0);

    return {
      total, paid, partial, overdue,
      totalOutstanding, monthlyRevenue, collectedRevenue,
      collectionRate: monthlyRevenue > 0 ? Math.round((collectedRevenue / monthlyRevenue) * 100) : 0,
    };
  }, [students, getTotalOutstanding]);

  // 필터링
  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.parent_name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(s => s.payment_status === statusFilter);
    }

    // 미납 → 부분납 → 완납 순
    const order = { overdue: 0, partial: 1, pending: 2, paid: 3 };
    result.sort((a, b) => (order[a.payment_status] || 4) - (order[b.payment_status] || 4));

    return result;
  }, [students, searchQuery, statusFilter]);

  // 수납 처리
  const handlePayment = async (paymentData) => {
    const result = await recordPayment(
      paymentData.studentId,
      paymentData.amount,
      paymentData.month,
      paymentData.method
    );
    if (result.success) {
      setShowPaymentModal(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-white">수납 관리</h1>
        <p className="text-gray-400 text-sm mt-1">
          수납현황과 미수금을 한눈에 관리
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">수납률</p>
              <p className="text-2xl font-bold text-green-400">{stats.collectionRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp size={24} className="text-green-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.paid}명 완납 / {stats.total}명
          </p>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">총 미수금</p>
              <p className="text-2xl font-bold text-red-400">{stats.totalOutstanding.toLocaleString()}원</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.overdue + stats.partial}명 미납/부분납
          </p>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">예상 월 매출</p>
              <p className="text-2xl font-bold text-cyan-400">{stats.monthlyRevenue.toLocaleString()}원</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <DollarSign size={24} className="text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">수납 완료</p>
              <p className="text-2xl font-bold text-orange-400">{stats.collectedRevenue.toLocaleString()}원</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <CreditCard size={24} className="text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 미수금 현황 바 */}
      {stats.totalOutstanding > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
              <span className="text-white font-medium">미수금 현황</span>
            </div>
            <span className="text-red-400 font-bold">{stats.totalOutstanding.toLocaleString()}원</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (stats.totalOutstanding / stats.monthlyRevenue) * 100)}%` }}
              className="h-full bg-red-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            예상 매출 대비 {Math.round((stats.totalOutstanding / stats.monthlyRevenue) * 100)}% 미수
          </p>
        </div>
      )}

      {/* 검색 & 필터 */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 학부모 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
        >
          <option value="all">전체 상태</option>
          <option value="paid">완납</option>
          <option value="partial">부분납</option>
          <option value="overdue">미납</option>
          <option value="pending">대기</option>
        </select>
      </div>

      {/* 학생 목록 */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? '검색 결과가 없습니다' : '학생이 없습니다'}
          </div>
        ) : (
          filteredStudents.map(student => (
            <StudentPaymentCard
              key={student.id}
              student={student}
              onPayment={(s) => setShowPaymentModal(s)}
              onOutstanding={(s) => setShowPaymentModal(s)}
            />
          ))
        )}
      </div>

      {/* 수납 모달 */}
      <AnimatePresence>
        {showPaymentModal && (
          <PaymentModal
            student={showPaymentModal}
            onClose={() => setShowPaymentModal(null)}
            onConfirm={handlePayment}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
