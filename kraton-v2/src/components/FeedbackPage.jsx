import React, { useState } from 'react';

// ============================================
// KRATON 1클릭 피드백 페이지
// 알림톡 → 이 페이지 → n8n Webhook → AI 학습
// ============================================

const FeedbackPage = () => {
  const [feedbackType, setFeedbackType] = useState(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // URL 파라미터에서 정보 추출
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('student_id') || window.location.pathname.split('/')[2];
  const cardType = params.get('type') || 'growth';
  const notificationId = params.get('nid');

  const feedbackOptions = cardType === 'growth' ? [
    { id: 'helpful', icon: '😊', label: '도움이 됐어요', color: 'emerald' },
    { id: 'neutral', icon: '😐', label: '보통이에요', color: 'gray' },
    { id: 'not_helpful', icon: '😕', label: '별로예요', color: 'orange' },
  ] : [
    { id: 'helpful', icon: '🙏', label: '감사합니다', color: 'emerald' },
    { id: 'want_call', icon: '📞', label: '연락 원해요', color: 'blue' },
    { id: 'concern', icon: '😟', label: '우려사항 있어요', color: 'red' },
  ];

  const handleSubmit = async () => {
    if (!feedbackType) return;
    setLoading(true);

    try {
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl + '/feedback-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            notification_id: notificationId,
            card_type: cardType,
            response: feedbackType,
            comment: comment || null,
            submitted_at: new Date().toISOString(),
          }),
        });
      }
      setSubmitted(true);
    } catch (error) {
      console.error('Feedback submission failed:', error);
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-600/20 rounded-full flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">감사합니다!</h1>
          <p className="text-gray-400 mb-6">
            소중한 의견이 전달되었습니다.<br />
            더 나은 서비스로 보답하겠습니다.
          </p>
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-gray-800 rounded-xl text-gray-300 hover:bg-gray-700 transition-all"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">🏛️</span>
          </div>
          <h1 className="text-xl font-bold">
            {cardType === 'growth' ? '성장 리포트가 도움이 되셨나요?' : '메시지가 도움이 되셨나요?'}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            1초만 투자해 주세요. 더 나은 서비스를 만드는 데 큰 도움이 됩니다.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {feedbackOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setFeedbackType(option.id)}
              className={`
                p-4 rounded-xl text-center transition-all duration-200
                ${feedbackType === option.id
                  ? `bg-${option.color}-600/30 ring-2 ring-${option.color}-500`
                  : 'bg-gray-900 hover:bg-gray-800'}
              `}
            >
              <span className="text-3xl block mb-2">{option.icon}</span>
              <span className="text-xs text-gray-400">{option.label}</span>
            </button>
          ))}
        </div>

        {feedbackType && (
          <div className="mb-6 animate-fadeIn">
            <label className="block text-sm text-gray-500 mb-2">
              추가 의견이 있으시면 남겨주세요 (선택)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="예: 더 자주 보내주세요 / 내용이 너무 길어요 / ..."
              className="w-full h-24 p-3 bg-gray-900 rounded-xl text-white placeholder-gray-600 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!feedbackType || loading}
          className={`
            w-full py-4 rounded-xl font-medium transition-all duration-200
            ${feedbackType
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              전송 중...
            </span>
          ) : (
            '피드백 보내기'
          )}
        </button>

        <p className="text-center text-gray-600 text-xs mt-6">
          KRATON · 더 나은 교육 경험을 위해
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FeedbackPage;
