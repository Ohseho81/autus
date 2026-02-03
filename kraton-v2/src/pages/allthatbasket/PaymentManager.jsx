/**
 * 💰 올댓바스켓 결제 관리
 *
 * 최소개발 최대효율 버전
 * - 미수금 목록 (SmartFit 조회)
 * - 결제링크 생성 + 알림톡 발송
 * - 결제 완료 목록 + SmartFit 동기화 체크
 * - 엑셀 다운로드 (하루 1회 수동 입력용)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import tossPayment from '../../services/tossPayment.js';
import alimtalk from '../../services/kakaoAlimtalk.js';
import outstandingAPI from '../../services/outstandingManager.js';

export default function PaymentManager() {
  const [tab, setTab] = useState('outstanding'); // outstanding | paid | history
  const [outstanding, setOutstanding] = useState([]);
  const [payments, setPayments] = useState([]);
  const [messageHistory, setMessageHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
    tossPayment.initDemoData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const outstandingResult = await outstandingAPI.getAll();
      setOutstanding(outstandingResult.data || []);
      setPayments(tossPayment.getPaymentRecords());
      setMessageHistory(alimtalk.getMessageHistory());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 결제링크 생성 + 알림톡 발송
  const handleSendPaymentLink = async (record) => {
    setSending(prev => ({ ...prev, [record.id]: true }));

    try {
      // 1. 결제링크 생성
      const linkResult = await tossPayment.createPaymentLink({
        studentId: record.id,
        studentName: record.student_name,
        parentPhone: record.parent_phone || '010-0000-0000',
        amount: record.amount,
        description: `${new Date().getMonth() + 1}월 수강료`,
      });

      if (!linkResult.success) {
        throw new Error(linkResult.error);
      }

      // 2. 알림톡 발송
      const alimtalkResult = await alimtalk.sendPaymentRequest({
        studentName: record.student_name,
        parentPhone: record.parent_phone || '010-0000-0000',
        amount: record.amount,
        paymentLink: linkResult.data.shortLink || linkResult.data.paymentLink,
      });

      if (alimtalkResult.success) {
        showToast(`${record.student_name}님께 청구서 발송 완료!`);
      } else {
        showToast(`결제링크 생성됨, 알림톡 발송 실패`, 'warning');
      }

      loadData();
    } catch (e) {
      showToast(e.message, 'error');
    }

    setSending(prev => ({ ...prev, [record.id]: false }));
  };

  // 일괄 발송
  const handleBulkSend = async () => {
    if (!outstanding.length) return;

    const confirmed = window.confirm(
      `${outstanding.length}명에게 청구서를 발송합니다.\n예상 비용: ${alimtalk.calculateCost(outstanding.length).formatted}\n\n진행하시겠습니까?`
    );

    if (!confirmed) return;

    setSending(prev => ({ ...prev, bulk: true }));

    let success = 0;
    let failed = 0;

    for (const record of outstanding) {
      try {
        const linkResult = await tossPayment.createPaymentLink({
          studentId: record.id,
          studentName: record.student_name,
          parentPhone: record.parent_phone || '010-0000-0000',
          amount: record.amount,
        });

        if (linkResult.success) {
          await alimtalk.sendPaymentRequest({
            studentName: record.student_name,
            parentPhone: record.parent_phone || '010-0000-0000',
            amount: record.amount,
            paymentLink: linkResult.data.shortLink,
          });
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    showToast(`발송 완료: ${success}건 성공, ${failed}건 실패`);
    setSending(prev => ({ ...prev, bulk: false }));
    loadData();
  };

  // 결제 완료 처리 (데모용)
  const handleMarkPaid = (orderId) => {
    tossPayment.markAsPaid(orderId, { method: '데모결제' });
    showToast('결제 완료 처리됨');
    loadData();
  };

  // SmartFit 동기화 완료 표시
  const handleMarkSynced = (orderId) => {
    tossPayment.markAsSynced(orderId);
    showToast('SmartFit 동기화 완료');
    loadData();
  };

  // 엑셀 다운로드
  const handleDownloadExcel = () => {
    const data = tossPayment.generateExcelData({ status: 'PAID', syncedToSmartFit: false });
    if (!data.length) {
      showToast('다운로드할 데이터가 없습니다', 'warning');
      return;
    }
    tossPayment.downloadCSV(data, `smartfit_sync_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('CSV 다운로드 완료');
  };

  const unsyncedCount = tossPayment.getUnsyncedCount();
  const paidPayments = payments.filter(p => p.status === 'PAID');
  const pendingPayments = payments.filter(p => p.status === 'PENDING');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <h1 className="text-lg font-bold">결제 관리</h1>
                <p className="text-xs text-gray-500">올댓바스켓</p>
              </div>
            </div>

            {unsyncedCount > 0 && (
              <button
                onClick={handleDownloadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
              >
                📥 SmartFit용 ({unsyncedCount}건)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 flex">
          {[
            { id: 'outstanding', label: '미수금', count: outstanding.length, icon: '💸' },
            { id: 'paid', label: '결제완료', count: paidPayments.length, icon: '✅' },
            { id: 'history', label: '발송이력', count: messageHistory.length, icon: '📱' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  tab === t.id ? 'bg-orange-100' : 'bg-gray-100'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {tab === 'outstanding' && (
            <OutstandingTab
              key="outstanding"
              data={outstanding}
              sending={sending}
              onSend={handleSendPaymentLink}
              onBulkSend={handleBulkSend}
            />
          )}
          {tab === 'paid' && (
            <PaidTab
              key="paid"
              data={paidPayments}
              onMarkSynced={handleMarkSynced}
              onDownload={handleDownloadExcel}
            />
          )}
          {tab === 'history' && (
            <HistoryTab
              key="history"
              data={messageHistory}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium ${
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 미수금 탭
// ============================================
function OutstandingTab({ data, sending, onSend, onBulkSend }) {
  const totalAmount = data.reduce((sum, r) => sum + r.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">총 미수금</p>
            <p className="text-2xl font-bold text-red-600">
              ₩{totalAmount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">{data.length}명</p>
          </div>
          <button
            onClick={onBulkSend}
            disabled={sending.bulk || !data.length}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 disabled:opacity-50"
          >
            {sending.bulk ? '발송 중...' : `📢 전체 발송 (${data.length}명)`}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {data.map(record => (
          <div
            key={record.id}
            className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    record.days_overdue >= 30 ? '#ef4444' :
                    record.days_overdue >= 14 ? '#f97316' :
                    record.days_overdue >= 7 ? '#eab308' : '#22c55e'
                }}
              />
              <div>
                <p className="font-medium">{record.student_name}</p>
                <p className="text-xs text-gray-500">
                  {record.days_overdue}일 경과 • {record.parent_phone || '연락처 없음'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-semibold">₩{record.amount.toLocaleString()}</p>
              <button
                onClick={() => onSend(record)}
                disabled={sending[record.id]}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {sending[record.id] ? '...' : '💬 발송'}
              </button>
            </div>
          </div>
        ))}

        {!data.length && (
          <div className="text-center py-12 text-gray-400">
            미수금이 없습니다 🎉
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// 결제완료 탭
// ============================================
function PaidTab({ data, onMarkSynced, onDownload }) {
  const unsynced = data.filter(p => !p.syncedToSmartFit);
  const synced = data.filter(p => p.syncedToSmartFit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* SmartFit 동기화 필요 */}
      {unsynced.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-medium text-yellow-800">SmartFit 입력 필요</p>
                <p className="text-xs text-yellow-600">{unsynced.length}건 미동기화</p>
              </div>
            </div>
            <button
              onClick={onDownload}
              className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600"
            >
              📥 엑셀 다운로드
            </button>
          </div>

          <div className="space-y-2">
            {unsynced.map(payment => (
              <div
                key={payment.id}
                className="bg-white rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{payment.studentName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(payment.paidAt).toLocaleString('ko-KR')} • {payment.paymentMethod}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">₩{payment.amount.toLocaleString()}</p>
                  <button
                    onClick={() => onMarkSynced(payment.id)}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                  >
                    ✅ 동기화 완료
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 동기화 완료 */}
      {synced.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-4 py-3 border-b">
            <p className="font-medium text-gray-700">동기화 완료 ({synced.length}건)</p>
          </div>
          <div className="divide-y">
            {synced.slice(0, 10).map(payment => (
              <div key={payment.id} className="px-4 py-3 flex justify-between">
                <div>
                  <p className="font-medium">{payment.studentName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(payment.paidAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <p className="font-semibold text-green-600">₩{payment.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!data.length && (
        <div className="text-center py-12 text-gray-400">
          결제 완료 내역이 없습니다
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// 발송 이력 탭
// ============================================
function HistoryTab({ data }) {
  const todayCount = alimtalk.getTodaySentCount();
  const cost = alimtalk.calculateCost(data.length);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-blue-600">{todayCount}</p>
          <p className="text-xs text-gray-500">오늘 발송</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold">{data.length}</p>
          <p className="text-xs text-gray-500">총 발송</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-gray-600">{cost.formatted}</p>
          <p className="text-xs text-gray-500">예상 비용</p>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="divide-y max-h-96 overflow-y-auto">
          {data.slice(0, 50).map(msg => (
            <div key={msg.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-blue-600">
                  {alimtalk.TEMPLATES[Object.keys(alimtalk.TEMPLATES).find(
                    k => alimtalk.TEMPLATES[k].code === msg.templateCode
                  )]?.title || msg.templateCode}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  msg.status === 'DEMO_SENT' || msg.status === 'SENT'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {msg.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">{msg.phone}</p>
              <p className="text-xs text-gray-400">
                {new Date(msg.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>
          ))}

          {!data.length && (
            <div className="text-center py-12 text-gray-400">
              발송 이력이 없습니다
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
