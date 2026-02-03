/**
 * 🏀 올댓바스켓 코치 대시보드
 *
 * 최소개발 최대효율 - 3가지 핵심 기능만
 * 1. 출석 체크
 * 2. 결석 알림 (학부모 푸시)
 * 3. 영상 → 유튜브 업로드
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// 데모 데이터 (SmartFit 연동 시 대체)
// ============================================
const DEMO_CLASSES = [
  { id: 1, name: '초등 A반', time: '16:00-17:00', day: '월수금' },
  { id: 2, name: '초등 B반', time: '17:00-18:00', day: '월수금' },
  { id: 3, name: '중등반', time: '18:00-19:30', day: '화목' },
];

const DEMO_STUDENTS = [
  { id: 1, name: '최여찬', classId: 1, phone: '010-2278-6129', parentPhone: '010-1111-2222' },
  { id: 2, name: '송은호', classId: 1, phone: '010-3456-7890', parentPhone: '010-2222-3333' },
  { id: 3, name: '김한준', classId: 1, phone: '010-9876-5432', parentPhone: '010-3333-4444' },
  { id: 4, name: '이선우', classId: 2, phone: '010-1234-5678', parentPhone: '010-4444-5555' },
  { id: 5, name: '최원준', classId: 2, phone: '010-5678-9012', parentPhone: '010-5555-6666' },
  { id: 6, name: '안도윤', classId: 2, phone: '010-6789-0123', parentPhone: '010-6666-7777' },
  { id: 7, name: '김지효', classId: 3, phone: '010-7890-1234', parentPhone: '010-7777-8888' },
  { id: 8, name: '박서연', classId: 3, phone: '010-8901-2345', parentPhone: '010-8888-9999' },
];

// ============================================
// 메인 컴포넌트
// ============================================
export default function CoachDashboard() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [selectedClass, setSelectedClass] = useState(DEMO_CLASSES[0]);
  const [attendance, setAttendance] = useState({});
  const [toast, setToast] = useState(null);

  const tabs = [
    { id: 'attendance', label: '출석', icon: '✅' },
    { id: 'notify', label: '결석알림', icon: '📢' },
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-500 text-white px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏀</span>
            <div>
              <h1 className="text-lg font-bold">코치 대시보드</h1>
              <p className="text-xs text-orange-100">{today}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">박코치</p>
            <p className="text-xs text-orange-100">올댓바스켓</p>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b sticky top-[72px] z-40">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-center font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-orange-600'
                  : 'text-gray-500'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
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
          {activeTab === 'attendance' && (
            <AttendanceTab
              key="attendance"
              classes={DEMO_CLASSES}
              students={DEMO_STUDENTS}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              attendance={attendance}
              setAttendance={setAttendance}
              showToast={showToast}
            />
          )}
          {activeTab === 'notify' && (
            <NotifyTab
              key="notify"
              classes={DEMO_CLASSES}
              students={DEMO_STUDENTS}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              attendance={attendance}
              showToast={showToast}
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
// 1. 출석 체크 탭
// ============================================
function AttendanceTab({ classes, students, selectedClass, setSelectedClass, attendance, setAttendance, showToast }) {
  const classStudents = students.filter(s => s.classId === selectedClass.id);
  const todayKey = new Date().toISOString().slice(0, 10);

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

  const presentCount = classStudents.filter(s => getAttendanceStatus(s.id) === 'present').length;
  const absentCount = classStudents.filter(s => getAttendanceStatus(s.id) === 'absent').length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
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

      {/* 출석 현황 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">{selectedClass.name}</h3>
            <p className="text-sm text-gray-500">{selectedClass.time} · {selectedClass.day}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">출석 {presentCount}</span>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">결석 {absentCount}</span>
          </div>
        </div>

        <button
          onClick={handleAllPresent}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold mb-4 active:scale-[0.98] transition-transform"
        >
          ✅ 전체 출석
        </button>

        {/* 학생 목록 */}
        <div className="space-y-2">
          {classStudents.map(student => {
            const status = getAttendanceStatus(student.id);
            return (
              <div
                key={student.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                  status === 'present' ? 'bg-green-50' :
                  status === 'absent' ? 'bg-red-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    status === 'present' ? 'bg-green-500' :
                    status === 'absent' ? 'bg-red-500' : 'bg-gray-300'
                  }`}>
                    {status === 'present' ? '✓' : status === 'absent' ? '✗' : student.name[0]}
                  </div>
                  <span className="font-medium">{student.name}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAttendance(student.id, 'present')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      status === 'present'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    출석
                  </button>
                  <button
                    onClick={() => handleAttendance(student.id, 'absent')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      status === 'absent'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    결석
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SmartFit 동기화 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="font-medium text-blue-800">SmartFit 동기화</p>
            <p className="text-sm text-blue-600 mt-1">
              출석 체크 후 SmartFit에서 동일하게 입력해주세요.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 2. 결석 알림 탭
// ============================================
function NotifyTab({ classes, students, selectedClass, setSelectedClass, attendance, showToast }) {
  const [sending, setSending] = useState(false);
  const [sentList, setSentList] = useState([]);
  const todayKey = new Date().toISOString().slice(0, 10);

  const classStudents = students.filter(s => s.classId === selectedClass.id);
  const absentStudents = classStudents.filter(s => attendance[`${todayKey}-${s.id}`] === 'absent');

  const handleSendNotification = async (student) => {
    setSending(true);
    // 실제로는 카카오 알림톡 API 호출
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSentList(prev => [...prev, student.id]);
    showToast(`${student.name} 학부모님께 결석 알림 발송!`);
    setSending(false);
  };

  const handleSendAll = async () => {
    if (absentStudents.length === 0) {
      showToast('결석 학생이 없습니다', 'warning');
      return;
    }
    setSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSentList(prev => [...prev, ...absentStudents.map(s => s.id)]);
    showToast(`${absentStudents.length}명 학부모님께 알림 발송 완료!`);
    setSending(false);
  };

  const isSent = (studentId) => sentList.includes(studentId);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
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

      {/* 결석 현황 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">결석 알림 발송</h3>
            <p className="text-sm text-gray-500">{selectedClass.name} · 결석 {absentStudents.length}명</p>
          </div>
        </div>

        {absentStudents.length > 0 ? (
          <>
            <button
              onClick={handleSendAll}
              disabled={sending}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold mb-4 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {sending ? '발송 중...' : `📢 전체 알림 발송 (${absentStudents.length}명)`}
            </button>

            <div className="space-y-2">
              {absentStudents.map(student => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    isSent(student.id) ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.parentPhone}</p>
                  </div>
                  {isSent(student.id) ? (
                    <span className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium">
                      ✓ 발송됨
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendNotification(student)}
                      disabled={sending}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      발송
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <span className="text-4xl block mb-2">🎉</span>
            결석 학생이 없습니다!
            <p className="text-sm mt-2">출석 탭에서 먼저 출석 체크를 해주세요.</p>
          </div>
        )}
      </div>

      {/* 알림 메시지 미리보기 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="font-medium text-yellow-800 mb-2">📱 알림 메시지 미리보기</p>
        <div className="bg-white rounded-lg p-3 text-sm text-gray-700">
          [올댓바스켓]<br />
          안녕하세요, OOO 학생 학부모님.<br />
          오늘 수업에 출석하지 않았습니다.<br />
          확인 부탁드립니다.
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 3. 영상 업로드 탭
// ============================================
function VideoTab({ showToast }) {
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('영상 파일만 선택해주세요', 'error');
      return;
    }

    // 미리보기용 추가
    const newVideo = {
      id: Date.now(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(1) + 'MB',
      file: file,
      thumbnail: URL.createObjectURL(file),
      status: 'ready', // ready, uploading, done
    };

    setVideos(prev => [...prev, newVideo]);
    showToast('영상이 추가되었습니다');
  };

  const handleUploadToYouTube = async (video) => {
    setUploading(true);
    setVideos(prev => prev.map(v =>
      v.id === video.id ? { ...v, status: 'uploading' } : v
    ));

    // 유튜브 업로드 페이지로 이동 (실제 API 연동 시 대체)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // YouTube Studio 열기
    window.open('https://studio.youtube.com/channel/upload', '_blank');

    setVideos(prev => prev.map(v =>
      v.id === video.id ? { ...v, status: 'done' } : v
    ));
    setUploading(false);
    showToast('YouTube Studio가 열렸습니다. 영상을 업로드해주세요!');
  };

  const handleRemove = (videoId) => {
    setVideos(prev => prev.filter(v => v.id !== videoId));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* 영상 추가 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">🎬 영상 → 유튜브 업로드</h3>

        <label className="block">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 transition-colors">
            <span className="text-4xl block mb-2">📹</span>
            <p className="font-medium text-gray-700">영상 파일 선택</p>
            <p className="text-sm text-gray-400 mt-1">탭하여 촬영 영상을 선택하세요</p>
          </div>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* 영상 목록 */}
      {videos.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">업로드 대기</h3>
          <div className="space-y-3">
            {videos.map(video => (
              <div
                key={video.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <video
                    src={video.thumbnail}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{video.name}</p>
                  <p className="text-sm text-gray-500">{video.size}</p>
                  {video.status === 'uploading' && (
                    <div className="w-full h-1 bg-gray-200 rounded-full mt-2">
                      <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {video.status === 'ready' && (
                    <button
                      onClick={() => handleUploadToYouTube(video)}
                      disabled={uploading}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      📺 업로드
                    </button>
                  )}
                  {video.status === 'done' && (
                    <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      ✓ 완료
                    </span>
                  )}
                  <button
                    onClick={() => handleRemove(video.id)}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
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
