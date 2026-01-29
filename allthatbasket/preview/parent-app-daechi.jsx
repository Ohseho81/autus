/**
 * 올댓바스켓 학부모 앱 - 대치동 스타일 (JSX Preview)
 *
 * 디자인 시스템:
 * - Primary Gradient: #667eea → #764ba2
 * - Background: #F5F6F8
 * - Card: #FFFFFF with shadow
 */

import React, { useState, useRef, useEffect } from 'react';

// Design Tokens
const colors = {
  primary: '#667eea',
  primaryDark: '#764ba2',
  background: '#F5F6F8',
  white: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: '#E5E7EB',
};

// Mock Data
const mockChildren = [
  { id: '1', name: '김민준', grade: '초3', avatar: '🏀', program: '주니어 드리블', level: '중급' },
  { id: '2', name: '김서연', grade: '초1', avatar: '⛹️', program: '키즈 농구', level: '초급' },
];

const mockSchedule = [
  { id: '1', date: '29', day: '목', time: '16:00-17:30', program: '주니어 드리블 마스터', coach: '박코치', court: 'A코트' },
  { id: '2', date: '31', day: '토', time: '10:00-11:30', program: '주니어 드리블 마스터', coach: '박코치', court: 'B코트' },
  { id: '3', date: '03', day: '화', time: '16:00-17:30', program: '주니어 드리블 마스터', coach: '박코치', court: 'A코트' },
];

const mockVideos = [
  { id: '1', title: '크로스오버 드리블', coach: '박코치', date: '1/27', duration: '0:45', tags: ['드리블', '크로스오버'], viewed: false },
  { id: '2', title: '레이업 슛 기초', coach: '박코치', date: '1/24', duration: '1:12', tags: ['슈팅', '레이업'], viewed: true },
  { id: '3', title: '수비 자세 교정', coach: '김코치', date: '1/22', duration: '0:38', tags: ['수비', '풋워크'], viewed: true },
];

// Main Component
export default function ParentApp() {
  const [selectedChild, setSelectedChild] = useState('1');
  const [activeTab, setActiveTab] = useState('schedule');
  const [chatMessages, setChatMessages] = useState([
    { id: '1', type: 'bot', content: '안녕하세요! 올댓바스켓 몰트봇입니다 🏀\n무엇을 도와드릴까요?', time: '10:00', quickReplies: ['수업 일정', '결제 상태', '코치 상담', '영상 보기'] }
  ]);
  const [inputValue, setInputValue] = useState('');

  const selectedChildData = mockChildren.find(c => c.id === selectedChild);
  const unwatchedVideos = mockVideos.filter(v => !v.viewed).length;

  const handleSend = (msg) => {
    const message = msg || inputValue;
    if (!message.trim()) return;

    setChatMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', content: message, time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) }]);
    setInputValue('');

    setTimeout(() => {
      let response;
      if (message.includes('일정') || message.includes('수업')) {
        response = { content: `${selectedChildData?.name} 학생의 수업 일정:\n\n📅 1/29(목) 16:00-17:30\n🏀 주니어 드리블 마스터\n👨‍🏫 박코치 · A코트` };
      } else if (message.includes('결제') || message.includes('상태')) {
        response = { content: '✅ 2월 수강료 결제 완료!\n\n💳 320,000원\n📅 결제일: 1/25\n🎫 QR: 활성화됨\n남은 수업: 8회' };
      } else if (message.includes('상담') || message.includes('코치')) {
        response = { content: '코치 상담 가능 시간:\n- 평일 14:00-16:00\n- 토요일 12:00-13:00', quickReplies: ['상담 예약', '나중에'] };
      } else if (message.includes('영상')) {
        response = { content: `🎬 새 영상 ${unwatchedVideos}개가 있습니다!\n'영상' 탭에서 확인하세요.` };
      } else {
        response = { content: '네, 알겠습니다! 더 도움이 필요하시면 말씀해주세요 😊', quickReplies: ['수업 일정', '결제 상태', '코치 상담'] };
      }
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'bot', time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), ...response }]);
    }, 600);
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: colors.background, minHeight: '100vh', maxWidth: 480, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '48px 20px 20px', color: 'white' }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>🏀 올댓바스켓</div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
          {mockChildren.map(child => (
            <div key={child.id} onClick={() => setSelectedChild(child.id)}
              style={{ background: child.id === selectedChild ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minWidth: 180, transition: 'all 0.2s' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{child.avatar}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{child.name}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{child.grade} · {child.level}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 }}>
        {[{ id: 'schedule', label: '📅 일정' }, { id: 'payment', label: '💳 결제' }, { id: 'videos', label: '🎬 영상' }, { id: 'chat', label: '💬 채팅' }].map(tab => (
          <div key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: 14, textAlign: 'center', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 500, color: activeTab === tab.id ? colors.primary : colors.textSecondary, borderBottom: `2px solid ${activeTab === tab.id ? colors.primary : 'transparent'}`, cursor: 'pointer', position: 'relative' }}>
            {tab.label}
            {tab.id === 'videos' && unwatchedVideos > 0 && (
              <span style={{ position: 'absolute', top: 8, right: 16, width: 18, height: 18, borderRadius: '50%', background: colors.danger, color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unwatchedVideos}</span>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {activeTab === 'schedule' && (
          <>
            <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>📅 1월 5주차</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {['월', '화', '수', '목', '금', '토', '일'].map((d, i) => (
                  <div key={d} style={{ textAlign: 'center', padding: '8px 4px' }}>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{d}</div>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 14, fontWeight: 500, background: i === 3 ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent', color: i === 3 ? 'white' : colors.text }}>
                      {[27, 28, 29, 30, 31, 1, 2][i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>🏀 다가오는 수업</div>
              {mockSchedule.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: idx < mockSchedule.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                  <div style={{ width: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>{item.date}</div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>{item.day}</div>
                  </div>
                  <div style={{ flex: 1, marginLeft: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{item.time}</div>
                    <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{item.program}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{item.coach} · {item.court}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'payment' && (
          <>
            <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 16, padding: 20, marginBottom: 16, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>출석 QR 상태</div>
                <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#4ADE80' }}>●</span> 활성화됨
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>2026-02-28까지 유효</div>
              </div>
              <div style={{ width: 64, height: 64, background: 'white', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📱</div>
            </div>
            <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>💳 2026년 2월 수강료</div>
              {[{ label: '결제 금액', value: '320,000원' }, { label: '결제 상태', value: <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#D1FAE5', color: '#059669' }}>결제 완료</span> }, { label: '결제일', value: '2026-01-25' }, { label: '남은 수업', value: '8 / 8회' }].map((row, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < 3 ? '1px solid #E5E7EB' : 'none' }}>
                  <span style={{ fontSize: 14, color: colors.textSecondary }}>{row.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
              <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 4 }} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'videos' && (
          <>
            {unwatchedVideos > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>🎬 새로운 연습 영상이 도착했어요!</span>
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>{unwatchedVideos}개</span>
              </div>
            )}
            {mockVideos.map(video => (
              <div key={video.id} style={{ display: 'flex', gap: 12, padding: 12, background: 'white', borderRadius: 12, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative' }}>
                {!video.viewed && <span style={{ position: 'absolute', top: -4, right: -4, background: colors.danger, color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>NEW</span>}
                <div style={{ width: 100, height: 75, borderRadius: 8, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, position: 'relative' }}>
                  🎬
                  <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{video.duration}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{video.title}</div>
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>{video.coach} · {video.date}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {video.tags.map((tag, i) => (
                      <span key={i} style={{ padding: '2px 8px', background: '#EEF2FF', color: colors.primary, borderRadius: 10, fontSize: 11, fontWeight: 500 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'chat' && (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              {chatMessages.map(msg => (
                <div key={msg.id} style={{ marginBottom: 12, textAlign: msg.type === 'user' ? 'right' : 'left' }}>
                  <div style={{ display: 'inline-block', maxWidth: '85%', padding: '12px 16px', borderRadius: 18, fontSize: 14, lineHeight: 1.5, background: msg.type === 'bot' ? '#F3F4F6' : colors.primary, color: msg.type === 'bot' ? colors.text : 'white', borderBottomLeftRadius: msg.type === 'bot' ? 4 : 18, borderBottomRightRadius: msg.type === 'user' ? 4 : 18 }}>
                    {msg.content.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</React.Fragment>)}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{msg.time}</div>
                  {msg.quickReplies && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: msg.type === 'bot' ? 'flex-start' : 'flex-end' }}>
                      {msg.quickReplies.map((reply, i) => (
                        <button key={i} onClick={() => handleSend(reply)} style={{ padding: '8px 14px', background: 'white', border: `1px solid ${colors.primary}`, borderRadius: 20, color: colors.primary, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{reply}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #E5E7EB' }}>
              <input type="text" placeholder="메시지를 입력하세요..." value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} style={{ flex: 1, padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: 24, fontSize: 14, outline: 'none' }} />
              <button onClick={() => handleSend()} style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer' }}>➤</button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-around', padding: '8px 0 24px', zIndex: 100 }}>
        {[{ id: 'home', icon: '🏠', label: '홈' }, { id: 'schedule', icon: '📅', label: '일정' }, { id: 'chat', icon: '💬', label: '상담' }, { id: 'profile', icon: '👤', label: '내정보' }].map(item => (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 16px', cursor: 'pointer', color: colors.textMuted, fontSize: 20 }}>
            <span>{item.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 500 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
