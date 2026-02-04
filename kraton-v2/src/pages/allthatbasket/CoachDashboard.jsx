/**
 * 🏀 올댓바스켓 강사 대시보드
 *
 * 강사 핵심 업무: 수업 진행
 * 프로세스: 상담 → 스케줄 → 수납 → [수업] → 성장 → 재등록
 *
 * 주요 기능:
 * 1. 출석 체크
 * 2. 결석 알림 (학부모 알림톡)
 * 3. 보충 승인
 * 4. 영상 업로드
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { makeupRequestService, REQUEST_STATUS } from '../../services/makeupRequest.js';
import { googleCalendarService } from '../../services/googleCalendar.js';

// ============================================
// 데모 데이터
// ============================================
const DEMO_CLASSES = [
  { id: 1, name: '유아부 A', time: '15:00-16:00', days: '월수금', students: 8 },
  { id: 2, name: '초등저 A', time: '16:00-17:00', days: '월수금', students: 12 },
  { id: 3, name: '초등고 A', time: '17:00-18:00', days: '월수금', students: 11 },
  { id: 4, name: '중등부', time: '18:00-19:30', days: '월수금', students: 8 },
];

const DEMO_STUDENTS = {
  1: [
    { id: 101, name: '김민서', age: 6 },
    { id: 102, name: '이서준', age: 6 },
    { id: 103, name: '박지안', age: 7 },
    { id: 104, name: '최예린', age: 6 },
    { id: 105, name: '정하윤', age: 7 },
    { id: 106, name: '강민준', age: 6 },
    { id: 107, name: '조서연', age: 7 },
    { id: 108, name: '윤지호', age: 6 },
  ],
  2: [
    { id: 201, name: '최여찬', age: 9 },
    { id: 202, name: '송은호', age: 8 },
    { id: 203, name: '김한준', age: 9 },
    { id: 204, name: '이선우', age: 8 },
    { id: 205, name: '최원준', age: 9 },
    { id: 206, name: '안도윤', age: 8 },
    { id: 207, name: '박서현', age: 9 },
    { id: 208, name: '정재원', age: 8 },
    { id: 209, name: '황시우', age: 9 },
    { id: 210, name: '임하린', age: 8 },
    { id: 211, name: '서지민', age: 9 },
    { id: 212, name: '배승우', age: 8 },
  ],
  3: [
    { id: 301, name: '김태현', age: 11 },
    { id: 302, name: '이준혁', age: 12 },
    { id: 303, name: '박민재', age: 11 },
    { id: 304, name: '정우진', age: 12 },
    { id: 305, name: '최성민', age: 11 },
    { id: 306, name: '강지훈', age: 12 },
    { id: 307, name: '조현우', age: 11 },
    { id: 308, name: '윤서진', age: 12 },
    { id: 309, name: '장민호', age: 11 },
    { id: 310, name: '한예준', age: 12 },
    { id: 311, name: '오승현', age: 11 },
  ],
  4: [
    { id: 401, name: '김지효', age: 14 },
    { id: 402, name: '박서연', age: 13 },
    { id: 403, name: '이도현', age: 14 },
    { id: 404, name: '정민규', age: 13 },
    { id: 405, name: '최서윤', age: 14 },
    { id: 406, name: '강현서', age: 13 },
    { id: 407, name: '조윤서', age: 14 },
    { id: 408, name: '임태양', age: 13 },
  ],
};

// ============================================
// 메인 컴포넌트
// ============================================
export default function CoachDashboard() {
  const [activeTab, setActiveTab] = useState('class');
  const [selectedClass, setSelectedClass] = useState(DEMO_CLASSES[0]);
  const [attendance, setAttendance] = useState({});
  const [toast, setToast] = useState(null);
  const [makeupRequests, setMakeupRequests] = useState([]);
  const [calendarStatus, setCalendarStatus] = useState({ connected: false, loading: true });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [makeupResult, calendarResult] = await Promise.all([
        makeupRequestService.getRequests({ status: REQUEST_STATUS.REQUESTED }),
        googleCalendarService.checkConnection(),
      ]);

      if (makeupResult.success) {
        setMakeupRequests(makeupResult.data);
      }
      setCalendarStatus({
        connected: calendarResult.connected,
        calendarId: calendarResult.calendarId,
        loading: false
      });
    } catch (e) {
      setCalendarStatus({ connected: false, loading: false });
    }
  };

  const tabs = [
    { id: 'class', label: '수업', icon: '🏀' },
    { id: 'makeup', label: '보충', icon: '📅', badge: makeupRequests.length },
    { id: 'video', label: '영상', icon: '🎬' },
  ];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 오늘 날짜
  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  // 현재 시간 기준 오늘 수업 찾기
  const getCurrentClass = () => {
    const hour = new Date().getHours();
    if (hour >= 15 && hour < 16) return DEMO_CLASSES[0];
    if (hour >= 16 && hour < 17) return DEMO_CLASSES[1];
    if (hour >= 17 && hour < 18) return DEMO_CLASSES[2];
    if (hour >= 18 && hour < 20) return DEMO_CLASSES[3];
    return DEMO_CLASSES[0];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">🏀</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">올댓바스켓</h1>
              <p className="text-xs text-orange-100">강사 · {today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Calendar Status */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              calendarStatus.connected ? 'bg-green-600' : 'bg-orange-400'
            }`}>
              <span>📅</span>
              <span className={`w-2 h-2 rounded-full ${calendarStatus.connected ? 'bg-green-300 animate-pulse' : 'bg-orange-200'}`} />
            </div>
            <button
              onClick={loadData}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              🔄
            </button>
          </div>
        </div>
      </header>

      {/* Process Flow - 강사 담당 영역 강조 */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          {['상담', '스케줄', '수납', '수업', '성장', '재등록'].map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                idx === 3 || idx === 4 ? 'bg-orange-500 text-white font-bold' : 'bg-gray-100 text-gray-400'
              }`}>
                <span>{['💬', '📅', '💰', '🏀', '📈', '🔄'][idx]}</span>
                <span>{step}</span>
              </div>
              {idx < 5 && <span className="mx-1 text-gray-300">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="bg-white border-b sticky top-[72px] z-40">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-center font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-orange-600'
                  : 'text-gray-500'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="coach-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'class' && (
            <ClassTab
              key="class"
              classes={DEMO_CLASSES}
              students={DEMO_STUDENTS}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              attendance={attendance}
              setAttendance={setAttendance}
              showToast={showToast}
            />
          )}
          {activeTab === 'makeup' && (
            <MakeupTab
              key="makeup"
              requests={makeupRequests}
              onRefresh={loadData}
              showToast={showToast}
              calendarStatus={calendarStatus}
            />
          )}
          {activeTab === 'video' && (
            <VideoTab
              key="video"
              showToast={showToast}
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
            className={`fixed bottom-6 left-4 right-4 px-4 py-3 rounded-xl shadow-lg text-white text-center font-medium ${
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
// 수업 탭 (출석 + 결석알림 통합)
// ============================================
function ClassTab({ classes, students, selectedClass, setSelectedClass, attendance, setAttendance, showToast }) {
  const [sending, setSending] = useState(false);
  const [sentList, setSentList] = useState([]);
  const todayKey = new Date().toISOString().slice(0, 10);

  const classStudents = students[selectedClass.id] || [];

  const getAttendanceStatus = (studentId) => {
    return attendance[`${todayKey}-${studentId}`] || null;
  };

  const handleAttendance = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [`${todayKey}-${studentId}`]: status,
    }));
  };

  const handleAllPresent = () => {
    const updates = {};
    classStudents.forEach(s => {
      updates[`${todayKey}-${s.id}`] = 'present';
    });
    setAttendance(prev => ({ ...prev, ...updates }));
    showToast(`${classStudents.length}명 전체 출석 처리!`);
  };

  const absentStudents = classStudents.filter(s => getAttendanceStatus(s.id) === 'absent');

  const handleSendAbsentNotify = async () => {
    if (absentStudents.length === 0) {
      showToast('결석 학생이 없습니다', 'warning');
      return;
    }
    setSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSentList(absentStudents.map(s => s.id));
    showToast(`${absentStudents.length}명 학부모님께 결석 알림 발송!`);
    setSending(false);
  };

  const presentCount = classStudents.filter(s => getAttendanceStatus(s.id) === 'present').length;
  const absentCount = absentStudents.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* 수업 정보 헤더 */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">🏀 {selectedClass.name}</h3>
            <p className="text-sm text-orange-100 mt-1">{selectedClass.time} · {selectedClass.days}</p>
          </div>
          <div className="text-right">
            <div className="flex gap-2 text-sm">
              <span className="px-2 py-1 bg-white/20 rounded-full">✓ {presentCount}</span>
              <span className="px-2 py-1 bg-red-600/50 rounded-full">✗ {absentCount}</span>
            </div>
            <p className="text-sm text-orange-100 mt-1">{classStudents.length}명</p>
          </div>
        </div>
      </div>

      {/* 반 선택 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedClass.id === cls.id
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 border'
            }`}
          >
            {cls.name}
          </button>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleAllPresent}
          className="py-3 bg-green-500 text-white rounded-xl font-semibold active:scale-[0.98] transition-transform"
        >
          ✅ 전체 출석
        </button>
        <button
          onClick={handleSendAbsentNotify}
          disabled={sending || absentCount === 0}
          className={`py-3 rounded-xl font-semibold active:scale-[0.98] transition-transform ${
            absentCount > 0
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {sending ? '발송 중...' : `📢 결석 알림 (${absentCount}명)`}
        </button>
      </div>

      {/* 학생 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-3 bg-gray-50 border-b">
          <p className="font-semibold text-gray-900 text-sm">출석 체크</p>
        </div>
        <div className="divide-y">
          {classStudents.map(student => {
            const status = getAttendanceStatus(student.id);
            const isSent = sentList.includes(student.id);

            return (
              <div
                key={student.id}
                className={`flex items-center justify-between p-3 transition-colors ${
                  status === 'present' ? 'bg-green-50' :
                  status === 'absent' ? 'bg-red-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    status === 'present' ? 'bg-green-500' :
                    status === 'absent' ? 'bg-red-500' : 'bg-gray-300'
                  }`}>
                    {status === 'present' ? '✓' : status === 'absent' ? '✗' : student.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.age}세</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status === 'absent' && isSent && (
                    <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">알림 발송</span>
                  )}
                  <button
                    onClick={() => handleAttendance(student.id, 'present')}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      status === 'present'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-green-100'
                    }`}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleAttendance(student.id, 'absent')}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      status === 'absent'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-red-100'
                    }`}
                  >
                    ✗
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="font-medium text-blue-800">수업 진행</p>
            <p className="text-sm text-blue-600 mt-1">
              출석 체크 → 결석자 알림 발송 → 수업 진행 → 영상 촬영
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 보충 승인 탭
// ============================================
function MakeupTab({ requests, onRefresh, showToast, calendarStatus }) {
  const [processing, setProcessing] = useState(false);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
  };

  const handleApprove = async (requestId) => {
    setProcessing(true);
    try {
      const result = await makeupRequestService.approveByCoach(requestId, 'coach_1');
      if (result.success) {
        showToast('보충 동의 완료! 관리자 승인 대기');
        onRefresh();
      } else {
        showToast(result.error || '처리 중 오류', 'error');
      }
    } catch (error) {
      showToast('처리 중 오류가 발생했습니다', 'error');
    }
    setProcessing(false);
  };

  const handleReject = async (requestId) => {
    setProcessing(true);
    try {
      const result = await makeupRequestService.reject(requestId, '해당 시간대에 수업이 어렵습니다.', 'coach_1');
      if (result.success) {
        showToast('보충 요청을 거절했습니다.');
        onRefresh();
      }
    } catch (error) {
      showToast('처리 중 오류가 발생했습니다', 'error');
    }
    setProcessing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* 캘린더 상태 */}
      <div className={`rounded-xl p-3 flex items-center justify-between ${
        calendarStatus?.connected
          ? 'bg-green-50 border border-green-200'
          : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span className="text-sm font-medium text-gray-700">
            {calendarStatus?.connected ? 'Google Calendar 연결됨' : '캘린더 데모 모드'}
          </span>
        </div>
        <div className={`w-2 h-2 rounded-full ${calendarStatus?.connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
      </div>

      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">📅 보충 요청</h3>
            <p className="text-sm text-purple-100 mt-1">학부모 요청 → 강사 동의 → 관리자 승인</p>
          </div>
          <div className="text-3xl font-bold">{requests.length}건</div>
        </div>
      </div>

      {/* 요청 목록 */}
      {requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map(request => (
            <div key={request.id} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🏀</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{request.studentName}</p>
                    <p className="text-sm text-gray-500">{request.originalClassName}</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  승인 대기
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-500">❌</span>
                  <span className="text-sm text-gray-500">결석:</span>
                  <span className="text-sm font-medium">{formatDate(request.originalDate)} {request.originalTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span className="text-sm text-gray-500">희망:</span>
                  <span className="text-sm font-medium">{formatDate(request.targetDate)} {request.targetTime}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={processing}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  ✓ 동의
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  disabled={processing}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold disabled:opacity-50"
                >
                  ✗ 거절
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border">
          <span className="text-5xl block mb-4">🎉</span>
          <p className="text-gray-500 font-medium">대기 중인 보충 요청이 없습니다</p>
        </div>
      )}

      {/* 데모 버튼 */}
      <button
        onClick={() => {
          makeupRequestService.initDemoData();
          onRefresh();
          showToast('데모 데이터 생성');
        }}
        className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-sm"
      >
        🔄 데모 데이터 생성
      </button>
    </motion.div>
  );
}

// ============================================
// 영상 업로드 탭
// ============================================
function VideoTab({ showToast }) {
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('영상 파일만 선택해주세요', 'error');
      return;
    }

    const newVideo = {
      id: Date.now(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(1) + 'MB',
      thumbnail: URL.createObjectURL(file),
      status: 'ready',
    };

    setVideos(prev => [...prev, newVideo]);
    showToast('영상 추가됨');
  };

  const handleUpload = async (video) => {
    setUploading(true);
    setVideos(prev => prev.map(v =>
      v.id === video.id ? { ...v, status: 'uploading' } : v
    ));

    await new Promise(resolve => setTimeout(resolve, 1000));
    window.open('https://studio.youtube.com/channel/upload', '_blank');

    setVideos(prev => prev.map(v =>
      v.id === video.id ? { ...v, status: 'done' } : v
    ));
    setUploading(false);
    showToast('YouTube Studio 열림');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">🎬 영상 업로드</h3>
            <p className="text-sm text-red-100 mt-1">수업 영상 → YouTube 업로드</p>
          </div>
          <span className="text-3xl">📹</span>
        </div>
      </div>

      {/* 파일 선택 */}
      <label className="block">
        <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-300 cursor-pointer hover:border-orange-400 transition-colors">
          <span className="text-4xl block mb-2">📹</span>
          <p className="font-medium text-gray-700">영상 파일 선택</p>
          <p className="text-sm text-gray-400 mt-1">탭하여 촬영 영상 선택</p>
        </div>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      {/* 영상 목록 */}
      {videos.length > 0 && (
        <div className="space-y-3">
          {videos.map(video => (
            <div key={video.id} className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                <video src={video.thumbnail} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{video.name}</p>
                <p className="text-sm text-gray-500">{video.size}</p>
              </div>
              {video.status === 'ready' && (
                <button
                  onClick={() => handleUpload(video)}
                  disabled={uploading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium"
                >
                  📺 업로드
                </button>
              )}
              {video.status === 'done' && (
                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  ✓ 완료
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="font-medium text-blue-800">업로드 방법</p>
            <ol className="text-sm text-blue-600 mt-1 space-y-1">
              <li>1. 영상 파일 선택</li>
              <li>2. "업로드" 버튼 클릭</li>
              <li>3. YouTube Studio에서 업로드 완료</li>
            </ol>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
