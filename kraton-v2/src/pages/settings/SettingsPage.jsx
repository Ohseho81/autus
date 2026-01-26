/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔧 SETTINGS PAGE - KRATON 설정
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
  },
};

// ============================================
// SETTING CATEGORIES
// ============================================
const CATEGORIES = [
  { id: 'academy', label: '학원 설정', icon: '🏫' },
  { id: 'notification', label: '알림 설정', icon: '🔔' },
  { id: 'automation', label: '자동화 설정', icon: '⚡' },
  { id: 'integration', label: '연동 설정', icon: '🔗' },
  { id: 'security', label: '보안 설정', icon: '🔒' },
];

// ============================================
// ACADEMY SETTINGS
// ============================================
const AcademySettings = memo(function AcademySettings({ settings, onUpdate }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>기본 정보</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">학원명</label>
            <input
              type="text"
              value={settings.academyName || '크라톤 학원'}
              onChange={(e) => onUpdate('academyName', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">대표 연락처</label>
            <input
              type="tel"
              value={settings.phone || '02-1234-5678'}
              onChange={(e) => onUpdate('phone', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-2">주소</label>
            <input
              type="text"
              value={settings.address || '서울시 강남구 테헤란로 123'}
              onChange={(e) => onUpdate('address', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>운영 시간</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">시작 시간</label>
            <input
              type="time"
              value={settings.startTime || '09:00'}
              onChange={(e) => onUpdate('startTime', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">종료 시간</label>
            <input
              type="time"
              value={settings.endTime || '22:00'}
              onChange={(e) => onUpdate('endTime', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm text-gray-400 mb-2">휴무일</label>
          <div className="flex gap-2">
            {['월', '화', '수', '목', '금', '토', '일'].map((day, idx) => (
              <button
                key={day}
                onClick={() => {
                  const closedDays = settings.closedDays || [];
                  const newDays = closedDays.includes(idx)
                    ? closedDays.filter(d => d !== idx)
                    : [...closedDays, idx];
                  onUpdate('closedDays', newDays);
                }}
                className={`w-10 h-10 rounded-lg font-medium transition-all ${
                  (settings.closedDays || []).includes(idx)
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================
// NOTIFICATION SETTINGS
// ============================================
const NotificationSettings = memo(function NotificationSettings({ settings, onUpdate }) {
  const notificationTypes = [
    { id: 'risk_alert', label: '위험 학생 알림', desc: 'State 5-6 학생 즉시 알림', icon: '🚨' },
    { id: 'payment', label: '결제 알림', desc: '수납 완료/미납 알림', icon: '💳' },
    { id: 'attendance', label: '출결 알림', desc: '결석/지각 알림', icon: '📋' },
    { id: 'report', label: '리포트 알림', desc: '주간/월간 리포트 발송', icon: '📊' },
    { id: 'message', label: '메시지 알림', desc: '학부모/학생 메시지', icon: '💬' },
    { id: 'schedule', label: '일정 알림', desc: '수업/상담 일정 알림', icon: '📅' },
  ];
  
  const channels = [
    { id: 'kakao', label: '카카오 알림톡', icon: '💬', connected: true },
    { id: 'slack', label: 'Slack', icon: '📢', connected: true },
    { id: 'email', label: '이메일', icon: '📧', connected: false },
    { id: 'sms', label: 'SMS', icon: '📱', connected: false },
    { id: 'push', label: '푸시 알림', icon: '🔔', connected: true },
  ];
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>알림 유형</h3>
        
        <div className="space-y-3">
          {notificationTypes.map((type) => (
            <div 
              key={type.id}
              className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{type.icon}</span>
                <div>
                  <p className="text-white font-medium">{type.label}</p>
                  <p className="text-gray-500 text-sm">{type.desc}</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={settings[type.id] !== false}
                onChange={(val) => onUpdate(type.id, val)}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>알림 채널</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {channels.map((channel) => (
            <div 
              key={channel.id}
              className={`p-4 rounded-xl border transition-all ${
                channel.connected
                  ? 'bg-gray-900/50 border-cyan-500/30'
                  : 'bg-gray-900/30 border-gray-700/50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{channel.icon}</span>
                  <span className="text-white font-medium">{channel.label}</span>
                </div>
                {channel.connected ? (
                  <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">연결됨</span>
                ) : (
                  <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded-full">미연결</span>
                )}
              </div>
              {!channel.connected && (
                <button className="w-full mt-2 py-2 text-sm text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors">
                  연결하기
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// AUTOMATION SETTINGS
// ============================================
const AutomationSettings = memo(function AutomationSettings({ settings, onUpdate }) {
  const automations = [
    { 
      id: 'auto_state_update', 
      label: 'State 자동 업데이트', 
      desc: '출결/성적 기반 자동 상태 전환',
      level: 'high',
    },
    { 
      id: 'auto_message', 
      label: '자동 메시지 발송', 
      desc: '위험 학생 학부모 자동 알림',
      level: 'medium',
    },
    { 
      id: 'auto_report', 
      label: '자동 리포트 생성', 
      desc: '주간/월간 리포트 자동 생성',
      level: 'high',
    },
    { 
      id: 'auto_reward', 
      label: '자동 보상 카드 발급', 
      desc: '목표 달성 시 자동 카드 발급',
      level: 'low',
    },
    { 
      id: 'auto_schedule', 
      label: '자동 일정 조정', 
      desc: '상담/수업 일정 자동 최적화',
      level: 'medium',
    },
    { 
      id: 'ai_insight', 
      label: 'AI 인사이트', 
      desc: 'Claude 기반 분석 및 추천',
      level: 'high',
    },
  ];
  
  const levelColors = {
    high: 'text-emerald-400',
    medium: 'text-yellow-400',
    low: 'text-gray-400',
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl p-6 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`${TOKENS.type.h2} text-white`}>전체 자동화 레벨</h3>
            <p className="text-gray-400 text-sm mt-1">자동화 정도를 조절합니다</p>
          </div>
          <div className="text-4xl font-bold text-cyan-400">
            {settings.automationLevel || 80}%
          </div>
        </div>
        
        <input
          type="range"
          min="0"
          max="100"
          value={settings.automationLevel || 80}
          onChange={(e) => onUpdate('automationLevel', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>수동</span>
          <span>반자동</span>
          <span>자동</span>
          <span>완전 자동</span>
        </div>
      </div>
      
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>자동화 기능</h3>
        
        <div className="space-y-3">
          {automations.map((auto) => (
            <div 
              key={auto.id}
              className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{auto.label}</p>
                  <span className={`text-xs ${levelColors[auto.level]}`}>
                    {auto.level === 'high' ? '⚡ 고효율' : auto.level === 'medium' ? '💡 중간' : '📌 기본'}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{auto.desc}</p>
              </div>
              <ToggleSwitch
                enabled={settings[auto.id] !== false}
                onChange={(val) => onUpdate(auto.id, val)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// INTEGRATION SETTINGS
// ============================================
const IntegrationSettings = memo(function IntegrationSettings({ settings, onUpdate }) {
  const integrations = [
    { id: 'supabase', label: 'Supabase', desc: '데이터베이스 & 인증', status: 'connected', icon: '⚡' },
    { id: 'toss', label: '토스페이먼츠', desc: '결제 처리', status: 'connected', icon: '💳' },
    { id: 'kakao', label: '카카오 알림톡', desc: '알림 메시지', status: 'connected', icon: '💬' },
    { id: 'slack', label: 'Slack', desc: '팀 알림', status: 'connected', icon: '📢' },
    { id: 'google', label: 'Google Calendar', desc: '일정 동기화', status: 'pending', icon: '📅' },
    { id: 'notion', label: 'Notion', desc: '문서 연동', status: 'disconnected', icon: '📝' },
    { id: 'classting', label: '클래스팅', desc: 'LMS 연동', status: 'disconnected', icon: '🎓' },
    { id: 'narakhub', label: '나라허브', desc: '행정 연동', status: 'disconnected', icon: '🏛️' },
  ];
  
  const statusColors = {
    connected: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '연결됨' },
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '대기 중' },
    disconnected: { bg: 'bg-gray-700/50', text: 'text-gray-500', label: '미연결' },
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>외부 서비스 연동</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {integrations.map((int) => {
            const status = statusColors[int.status];
            return (
              <div 
                key={int.id}
                className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{int.icon}</span>
                    <div>
                      <p className="text-white font-medium">{int.label}</p>
                      <p className="text-gray-500 text-xs">{int.desc}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>
                
                {int.status === 'connected' ? (
                  <button className="w-full py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
                    연결 해제
                  </button>
                ) : (
                  <button className="w-full py-2 text-sm text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors">
                    연결하기
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>API 설정</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value="••••••••••••••••"
                readOnly
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white"
              />
              <button className="px-4 py-2 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors">
                재발급
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Webhook URL</label>
            <input
              type="url"
              value={settings.webhookUrl || 'https://api.kraton.io/webhook/'}
              onChange={(e) => onUpdate('webhookUrl', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================
// SECURITY SETTINGS
// ============================================
const SecuritySettings = memo(function SecuritySettings({ settings, onUpdate }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>접근 권한</h3>
        
        <div className="space-y-3">
          {[
            { id: 'two_factor', label: '2단계 인증', desc: '로그인 시 추가 인증 요구' },
            { id: 'ip_restrict', label: 'IP 제한', desc: '지정된 IP에서만 접근 허용' },
            { id: 'session_timeout', label: '세션 타임아웃', desc: '30분 미사용 시 자동 로그아웃' },
            { id: 'audit_log', label: '감사 로그', desc: '모든 활동 기록 보관' },
          ].map((item) => (
            <div 
              key={item.id}
              className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/50"
            >
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
              <ToggleSwitch
                enabled={settings[item.id] !== false}
                onChange={(val) => onUpdate(item.id, val)}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>데이터 관리</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
            <div>
              <p className="text-white font-medium">데이터 백업</p>
              <p className="text-gray-500 text-sm">마지막 백업: 2024-01-24 10:30</p>
            </div>
            <button className="px-4 py-2 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors">
              지금 백업
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-red-500/30">
            <div>
              <p className="text-white font-medium">데이터 초기화</p>
              <p className="text-red-400 text-sm">모든 데이터가 삭제됩니다</p>
            </div>
            <button className="px-4 py-2 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
              초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================
// TOGGLE SWITCH COMPONENT
// ============================================
const ToggleSwitch = memo(function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-cyan-500' : 'bg-gray-700'
      }`}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        animate={{ left: enabled ? '1.75rem' : '0.25rem' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
});

// ============================================
// MAIN SETTINGS PAGE
// ============================================
export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState('academy');
  const [settings, setSettings] = useState({
    // Academy
    academyName: '크라톤 학원',
    phone: '02-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    startTime: '09:00',
    endTime: '22:00',
    closedDays: [0], // Sunday
    
    // Notification
    risk_alert: true,
    payment: true,
    attendance: true,
    report: true,
    message: true,
    schedule: true,
    
    // Automation
    automationLevel: 80,
    auto_state_update: true,
    auto_message: true,
    auto_report: true,
    auto_reward: false,
    auto_schedule: true,
    ai_insight: true,
    
    // Security
    two_factor: true,
    ip_restrict: false,
    session_timeout: true,
    audit_log: true,
  });
  
  const [saved, setSaved] = useState(false);
  
  const handleUpdate = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };
  
  const handleSave = () => {
    // TODO: Save to backend/Supabase
    console.log('Saving settings:', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const renderContent = () => {
    switch (activeCategory) {
      case 'academy':
        return <AcademySettings settings={settings} onUpdate={handleUpdate} />;
      case 'notification':
        return <NotificationSettings settings={settings} onUpdate={handleUpdate} />;
      case 'automation':
        return <AutomationSettings settings={settings} onUpdate={handleUpdate} />;
      case 'integration':
        return <IntegrationSettings settings={settings} onUpdate={handleUpdate} />;
      case 'security':
        return <SecuritySettings settings={settings} onUpdate={handleUpdate} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white`}>⚙️ 설정</h1>
          <p className="text-gray-500 mt-1">시스템 설정을 관리합니다</p>
        </div>
        
        <motion.button
          onClick={handleSave}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/25'
          }`}
        >
          {saved ? '✓ 저장됨' : '저장하기'}
        </motion.button>
      </div>
      
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <nav className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 sticky top-24">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all mb-1 ${
                  activeCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="font-medium">{cat.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
