import React, { useState } from 'react';

// ============================================
// KRATON FEEDBACK PAGE
// 1클릭 피드백 수집 페이지
// ============================================

const FeedbackPage = () => {
  const [feedbackType, setFeedbackType] = useState(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // URL 파라미터 파싱 (실제 환경에서는 react-router 등 사용)
  const getParams = () => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
      studentId: params.get('student_id') || window.location.pathname.split('/').pop() || 'demo',
      cardType: params.get('type') || 'growth',
      studentName: params.get('name') || '학생',
    };
  };

  const { studentId, cardType, studentName } = getParams();

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
      console.log('Feedback submitted:', {
        student_id: studentId,
        card_type: cardType,
        response: feedbackType,
        comment: comment || null,
      });

      await new Promise(r => setTimeout(r, 500));
      setSubmitted(true);
    } catch (error) {
      console.error('Feedback error:', error);
      setSubmitted(true);
    }
    setLoading(false);
  };

  // 성공 화면
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-600/20 rounded-full flex items-center justify-center border-2 border-emerald-500/30">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            감사합니다!
          </h1>
          <p className="text-gray-400 mb-6">소중한 의견이 전달되었습니다.</p>
          <p className="text-xs text-gray-600">피드백은 더 나은 서비스를 위해 활용됩니다.</p>
          
          {feedbackType === 'want_call' && (
            <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
              <p className="text-blue-400 text-sm">📞 담당 선생님이 24시간 내 연락드리겠습니다.</p>
            </div>
          )}
          {feedbackType === 'concern' && (
            <div className="mt-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">🚨 우려사항이 접수되었습니다. 빠른 시일 내 상담 연락드리겠습니다.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-2xl">🏛️</span>
          </div>
          <h1 className="text-xl font-bold mb-2">
            {cardType === 'growth' ? '성장 리포트가 도움이 되셨나요?' : '메시지가 도움이 되셨나요?'}
          </h1>
          {studentName && (
            <p className="text-gray-500 text-sm">{studentName} 학생 관련</p>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {feedbackOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setFeedbackType(option.id)}
              className={`p-4 rounded-xl text-center transition-all duration-200 ${
                feedbackType === option.id
                  ? `bg-${option.color}-600/30 ring-2 ring-${option.color}-500 scale-105`
                  : 'bg-gray-900 hover:bg-gray-800 hover:scale-102'
              }`}
            >
              <span className="text-3xl block mb-2">{option.icon}</span>
              <span className="text-xs text-gray-400">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Comment */}
        {feedbackType && (
          <div className="mb-6 animate-fadeIn">
            <label className="block text-xs text-gray-500 mb-2">추가 의견 (선택)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="더 나은 서비스를 위해 의견을 남겨주세요..."
              className="w-full h-24 p-4 bg-gray-900 rounded-xl text-white placeholder-gray-600 resize-none border border-gray-800 focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!feedbackType || loading}
          className={`w-full py-4 rounded-xl font-medium transition-all duration-200 ${
            feedbackType 
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              전송 중...
            </span>
          ) : '피드백 보내기'}
        </button>

        {/* Privacy Notice */}
        <p className="text-center text-xs text-gray-600 mt-6">
          🔒 피드백은 익명으로 처리되며, 서비스 개선에만 사용됩니다.
        </p>

        {/* Branding */}
        <div className="text-center mt-12">
          <p className="text-gray-700 text-xs">Powered by <span className="text-gray-500">KRATON</span></p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default FeedbackPage;
