'use client';

import { useState, useEffect } from 'react';

const FUNCTION_URL = 'https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/attendance-response';

type Step = 'loading' | 'main' | 'absent' | 'request_category' | 'request_sub' | 'request_text' | 'done' | 'error';

interface TokenData {
  student_name: string;
  class_name: string;
  date: string;
  makeup_slots: string[];
}

interface Category {
  key: string;
  label: string;
  subs: { key: string; label: string }[];
}

const REQUEST_CATEGORIES: Category[] = [
  {
    key: 'schedule',
    label: '일정 관련',
    subs: [
      { key: 'change_time', label: '시간 변경' },
      { key: 'change_day', label: '요일 변경' },
      { key: 'temporary_pause', label: '일시 중단' },
    ],
  },
  {
    key: 'curriculum',
    label: '수업 관련',
    subs: [
      { key: 'difficulty', label: '난이도 조절' },
      { key: 'focus_area', label: '중점 영역 변경' },
      { key: 'extra_practice', label: '추가 연습 요청' },
    ],
  },
  {
    key: 'communication',
    label: '소통 관련',
    subs: [
      { key: 'progress_report', label: '진도 상담 요청' },
      { key: 'coach_feedback', label: '코치 피드백 요청' },
      { key: 'other', label: '기타 문의' },
    ],
  },
];

export default function AttendPage() {
  const [step, setStep] = useState<Step>('loading');
  const [token, setToken] = useState('');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // absent
  const [selectedSlot, setSelectedSlot] = useState('');
  const [customSlot, setCustomSlot] = useState('');

  // request
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSub, setSelectedSub] = useState('');
  const [requestText, setRequestText] = useState('');

  const [doneMessage, setDoneMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setErrorMsg('유효하지 않은 링크입니다.');
      setStep('error');
      return;
    }
    setToken(t);
    fetchTokenData(t);
  }, []);

  async function fetchTokenData(t: string) {
    try {
      const res = await fetch(`${FUNCTION_URL}?token=${t}`);
      if (!res.ok) throw new Error('토큰 조회 실패');
      const data = await res.json();
      setTokenData(data);
      setStep('main');
    } catch {
      setErrorMsg('링크가 만료되었거나 유효하지 않습니다.');
      setStep('error');
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'confirm' }),
      });
      if (!res.ok) throw new Error();
      setDoneMessage('출석이 확인되었습니다. 감사합니다!');
      setStep('done');
    } catch {
      setErrorMsg('처리 중 오류가 발생했습니다.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAbsentSubmit() {
    const slot = selectedSlot === 'custom' ? customSlot : selectedSlot;
    if (!slot) return;
    setSubmitting(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'absent',
          slot,
          custom_slot: selectedSlot === 'custom' ? customSlot : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setDoneMessage('결석 및 보강 희망 시간이 접수되었습니다.');
      setStep('done');
    } catch {
      setErrorMsg('처리 중 오류가 발생했습니다.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestSubmit() {
    if (!selectedCategory || !selectedSub) return;
    setSubmitting(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'request',
          category: selectedCategory.key,
          sub: selectedSub,
          text: requestText,
        }),
      });
      if (!res.ok) throw new Error();
      setDoneMessage('요청이 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.');
      setStep('done');
    } catch {
      setErrorMsg('처리 중 오류가 발생했습니다.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">😔</div>
          <p className="text-gray-700">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-700 font-medium">{doneMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-sm mx-auto space-y-4">
        {/* Header */}
        {tokenData && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h1 className="text-lg font-bold text-gray-900 mb-2">출석 확인</h1>
            <div className="space-y-1 text-sm text-gray-600">
              <p>학생: <span className="font-semibold text-gray-900">{tokenData.student_name}</span></p>
              <p>수업: {tokenData.class_name}</p>
              <p>날짜: {tokenData.date}</p>
            </div>
          </div>
        )}

        {/* Main Selection */}
        {step === 'main' && (
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? '처리 중...' : '✅ 출석합니다'}
            </button>
            <button
              onClick={() => setStep('absent')}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 rounded-xl border border-gray-200 transition-colors"
            >
              ❌ 결석합니다
            </button>
            <button
              onClick={() => setStep('request_category')}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 rounded-xl border border-gray-200 transition-colors"
            >
              📋 별도 부탁이 있어요
            </button>
          </div>
        )}

        {/* Absent - Makeup Slot Selection */}
        {step === 'absent' && tokenData && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-1">보강 희망 시간</h2>
            <p className="text-xs text-gray-500 mb-4">가능한 시간을 선택해주세요</p>
            <div className="space-y-2 mb-4">
              {(tokenData.makeup_slots || []).map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors text-left ${
                    selectedSlot === slot
                      ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {slot}
                </button>
              ))}
              <button
                onClick={() => setSelectedSlot('custom')}
                className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors text-left ${
                  selectedSlot === 'custom'
                    ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                    : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                ✏️ 직접 입력
              </button>
            </div>
            {selectedSlot === 'custom' && (
              <input
                type="text"
                value={customSlot}
                onChange={(e) => setCustomSlot(e.target.value)}
                placeholder="희망 시간을 입력하세요 (예: 수요일 5시)"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setStep('main'); setSelectedSlot(''); setCustomSlot(''); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                이전
              </button>
              <button
                onClick={handleAbsentSubmit}
                disabled={submitting || (!selectedSlot || (selectedSlot === 'custom' && !customSlot))}
                className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? '처리 중...' : '접수하기'}
              </button>
            </div>
          </div>
        )}

        {/* Request - Category Selection */}
        {step === 'request_category' && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-1">어떤 부탁인가요?</h2>
            <p className="text-xs text-gray-500 mb-4">카테고리를 선택해주세요</p>
            <div className="space-y-2 mb-4">
              {REQUEST_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setSelectedCategory(cat); setStep('request_sub'); }}
                  className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors text-left"
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('main')}
              className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              이전
            </button>
          </div>
        )}

        {/* Request - Sub-category Selection */}
        {step === 'request_sub' && selectedCategory && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-1">{selectedCategory.label}</h2>
            <p className="text-xs text-gray-500 mb-4">세부 항목을 선택해주세요</p>
            <div className="space-y-2 mb-4">
              {selectedCategory.subs.map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => { setSelectedSub(sub.key); setStep('request_text'); }}
                  className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors text-left"
                >
                  {sub.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setStep('request_category'); setSelectedCategory(null); }}
              className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              이전
            </button>
          </div>
        )}

        {/* Request - Text Input */}
        {step === 'request_text' && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-1">상세 내용</h2>
            <p className="text-xs text-gray-500 mb-4">추가로 전달할 내용이 있으면 입력해주세요</p>
            <textarea
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="내용을 입력하세요 (선택사항)"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setStep('request_sub'); setRequestText(''); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                이전
              </button>
              <button
                onClick={handleRequestSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? '처리 중...' : '요청하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
