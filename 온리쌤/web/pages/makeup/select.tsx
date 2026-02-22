/**
 * 보충수업 선택 페이지
 * 알림톡에서 결석 버튼 클릭 시 이동
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface MakeupSlot {
  id: string;
  date: string;
  time: string;
  location: string;
  coach_name: string;
  available_spots: number;
}

export default function MakeupSelectPage() {
  const router = useRouter();
  const { token } = router.query;
  
  const [slots, setSlots] = useState<MakeupSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/makeup/slots?token=${token}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setSlots(data.slots);
        setStudentName(data.studentName);
      }
    } catch (e) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSlot) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/makeup/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, slotId: selectedSlot }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        router.push('/makeup/confirmed');
      } else {
        setError(data.error || '예약 중 오류가 발생했습니다.');
      }
    } catch (e) {
      setError('처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-box">
          <h2>⚠️ 오류</h2>
          <p>{error}</p>
          <button onClick={() => window.close()}>닫기</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>보충수업 선택 | 온리쌤</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <header className="header">
          <span className="logo">🏀</span>
          <h1>온리쌤</h1>
        </header>

        <main className="main">
          <div className="title-section">
            <h2>보충수업 선택</h2>
            <p>{studentName} 학생의 보충수업 일정을 선택해주세요.</p>
          </div>

          <div className="slots-list">
            {slots.length === 0 ? (
              <div className="empty">
                <p>현재 예약 가능한 보충수업이 없습니다.</p>
                <p>학원으로 문의해주세요.</p>
              </div>
            ) : (
              slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`slot-card ${selectedSlot === slot.id ? 'selected' : ''} ${slot.available_spots === 0 ? 'disabled' : ''}`}
                  onClick={() => slot.available_spots > 0 && setSelectedSlot(slot.id)}
                >
                  <div className="slot-date">
                    <span className="date">{formatDate(slot.date)}</span>
                    <span className="time">{slot.time}</span>
                  </div>
                  <div className="slot-info">
                    <span className="location">📍 {slot.location}</span>
                    <span className="coach">👨‍🏫 {slot.coach_name}</span>
                  </div>
                  <div className="slot-status">
                    {slot.available_spots > 0 ? (
                      <span className="available">잔여 {slot.available_spots}석</span>
                    ) : (
                      <span className="full">마감</span>
                    )}
                  </div>
                  {selectedSlot === slot.id && (
                    <div className="check">✓</div>
                  )}
                </div>
              ))
            )}
          </div>

          {slots.length > 0 && (
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!selectedSlot || submitting}
            >
              {submitting ? '처리 중...' : '보충수업 확정하기'}
            </button>
          )}
        </main>

        <footer className="footer">
          <p>문의: 02-1234-5678</p>
        </footer>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0D0D0D 0%, #1a1a2e 100%);
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .logo {
          font-size: 28px;
        }

        .header h1 {
          font-size: 18px;
          font-weight: 700;
        }

        .main {
          padding: 20px;
          max-width: 500px;
          margin: 0 auto;
        }

        .title-section {
          margin-bottom: 24px;
        }

        .title-section h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .title-section p {
          color: rgba(255,255,255,0.6);
          font-size: 14px;
        }

        .slots-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .slot-card {
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .slot-card:hover:not(.disabled) {
          border-color: rgba(255,107,53,0.5);
        }

        .slot-card.selected {
          border-color: #FF6B35;
          background: rgba(255,107,53,0.1);
        }

        .slot-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .slot-date {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
        }

        .date {
          font-size: 18px;
          font-weight: 700;
        }

        .time {
          font-size: 16px;
          color: #FF6B35;
        }

        .slot-info {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 8px;
        }

        .slot-status {
          display: flex;
          justify-content: flex-end;
        }

        .available {
          font-size: 12px;
          color: #00D4AA;
          background: rgba(0,212,170,0.1);
          padding: 4px 8px;
          border-radius: 8px;
        }

        .full {
          font-size: 12px;
          color: #FF6B6B;
          background: rgba(255,107,107,0.1);
          padding: 4px 8px;
          border-radius: 8px;
        }

        .check {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 24px;
          height: 24px;
          background: #FF6B35;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
        }

        .submit-btn {
          width: 100%;
          padding: 16px;
          margin-top: 24px;
          background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          transform: scale(1.02);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .footer {
          padding: 20px;
          text-align: center;
          color: rgba(255,255,255,0.4);
          font-size: 12px;
        }

        .loading, .empty {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255,255,255,0.6);
        }

        .error-box {
          text-align: center;
          padding: 40px 20px;
        }

        .error-box h2 {
          font-size: 24px;
          margin-bottom: 12px;
        }

        .error-box p {
          color: rgba(255,255,255,0.6);
          margin-bottom: 20px;
        }

        .error-box button {
          padding: 12px 24px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
