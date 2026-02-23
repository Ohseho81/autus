'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * /makeup — 보충 수업 선택 페이지
 *
 * 결석 → 연생 기반 3후보 → 학부모 선택 → 확정
 * URL: /makeup?token=xxx (attendance_tokens.token)
 *
 * Flow:
 * 1. token으로 offers 조회
 * 2. 3개 슬롯 카드 표시
 * 3. 선택 → 정원 선점 → 확정
 * 4. 마감 시 → 다음 후보 안내
 */

const SUPABASE_FN_URL = 'https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/makeup-booking';

type Step = 'loading' | 'offers' | 'confirming' | 'done' | 'error' | 'no_offers';

interface MakeupOffer {
  id: string;
  rank: number;
  status: string;
  expires_at: string;
  schedules: {
    id: string;
    title: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location: string;
    instructor: string;
    max_capacity: number;
    booked_count: number;
  } | null;
}

interface BookingResult {
  booking_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export default function MakeupPage() {
  const [step, setStep] = useState<Step>('loading');
  const [studentName, setStudentName] = useState('');
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [offers, setOffers] = useState<MakeupOffer[]>([]);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setStep('error');
      setErrorMsg('유효한 토큰이 없습니다.');
      return;
    }
    loadOffers(token);
  }, []);

  async function loadOffers(token: string) {
    try {
      const res = await fetch(`${SUPABASE_FN_URL}?token=${token}`);
      const data = await res.json();

      if (data.error) {
        setStep('error');
        setErrorMsg(data.error);
        return;
      }

      setStudentName(data.student_name || '');
      setBirthYear(data.birth_year);

      if (!data.offers?.length) {
        setStep('no_offers');
        return;
      }

      setOffers(data.offers);
      setStep('offers');
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err.message);
    }
  }

  const handleChoose = useCallback(async (offerId: string) => {
    setSelectedId(offerId);
    setStep('confirming');

    try {
      const res = await fetch(SUPABASE_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'choose', offer_id: offerId }),
      });
      const data = await res.json();

      if (data.success) {
        setBooking(data);
        setStep('done');
      } else if (data.full) {
        // 정원 초과 → 해당 카드 비활성화, 다른 후보 안내
        setOffers(prev => prev.filter(o => o.id !== offerId));
        setStep('offers');
        setErrorMsg('선택하신 시간은 마감되었습니다. 다른 시간을 선택해주세요.');
      } else {
        setStep('error');
        setErrorMsg(data.error || '예약 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err.message);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* 헤더 */}
        <div className="text-center space-y-1">
          <div className="text-3xl">📅</div>
          <h1 className="text-lg font-bold text-gray-900">보충 수업 선택</h1>
          {studentName && (
            <p className="text-sm text-gray-500">
              {studentName} 학생{birthYear ? ` (${birthYear}년생)` : ''}
            </p>
          )}
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <Card>
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">보충 가능한 시간을 찾고 있습니다...</p>
            </div>
          </Card>
        )}

        {/* Error */}
        {step === 'error' && (
          <Card>
            <div className="text-center space-y-3 py-4">
              <div className="text-4xl">😢</div>
              <p className="text-gray-700 text-sm">{errorMsg}</p>
              <p className="text-gray-400 text-xs">
                문제가 계속되면 학원에 직접 연락해주세요.
              </p>
            </div>
          </Card>
        )}

        {/* No Offers */}
        {step === 'no_offers' && (
          <Card>
            <div className="text-center space-y-3 py-4">
              <div className="text-4xl">📭</div>
              <p className="text-gray-700 text-sm">
                현재 가능한 보충 수업이 없습니다.
              </p>
              <p className="text-gray-400 text-xs">
                학원에서 별도 안내드리겠습니다.
              </p>
            </div>
          </Card>
        )}

        {/* Offers */}
        {step === 'offers' && (
          <>
            {errorMsg && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-xs text-center">
                ⚠️ {errorMsg}
              </div>
            )}

            <p className="text-center text-gray-500 text-xs">
              아래 시간 중 원하시는 보충 수업을 선택해주세요
            </p>

            <div className="space-y-3">
              {offers.map((offer) => {
                const sched = offer.schedules;
                if (!sched) return null;
                const remaining = (sched.max_capacity || 99) - (sched.booked_count || 0);

                return (
                  <button
                    key={offer.id}
                    onClick={() => handleChoose(offer.id)}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {DAY_NAMES[sched.day_of_week]}요일
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {sched.start_time?.slice(0, 5)} ~ {sched.end_time?.slice(0, 5)}
                          </span>
                        </div>
                        {sched.title && (
                          <p className="text-xs text-gray-600">{sched.title}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {sched.location && <span>📍 {sched.location}</span>}
                          {sched.instructor && <span>👤 {sched.instructor}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-medium ${remaining <= 2 ? 'text-red-500' : 'text-green-600'}`}>
                          잔여 {remaining}석
                        </div>
                        <div className="text-[10px] text-gray-300 mt-1">
                          #{offer.rank}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-center text-[10px] text-gray-300 pt-2">
              72시간 내 미선택 시 자동 만료됩니다
            </p>
          </>
        )}

        {/* Confirming */}
        {step === 'confirming' && (
          <Card>
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-600 text-sm">예약을 확정하고 있습니다...</p>
            </div>
          </Card>
        )}

        {/* Done */}
        {step === 'done' && booking && (
          <Card>
            <div className="text-center space-y-4 py-4">
              <div className="text-5xl">✅</div>
              <h2 className="text-lg font-bold text-gray-900">보충 수업 확정!</h2>
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">날짜</span>
                  <span className="font-medium text-gray-800">{booking.session_date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">시간</span>
                  <span className="font-medium text-gray-800">
                    {booking.start_time?.slice(0, 5)} ~ {booking.end_time?.slice(0, 5)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                보충 수업에 참석해주세요. 감사합니다 🙏
              </p>
            </div>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-300 pt-2">
          온리쌤 | 보충 수업 자동 안내
        </p>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      {children}
    </div>
  );
}
