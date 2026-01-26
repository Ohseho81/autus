/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👤 PROFILE PAGE - 프로필 관리
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/supabase/auth';

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
// PROFILE HEADER
// ============================================
const ProfileHeader = memo(function ProfileHeader({ user, role }) {
  return (
    <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl p-8 border border-gray-700/50">
      <div className="flex items-center gap-6">
        {/* Avatar */}
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-4xl shadow-xl">
            {role?.icon || '👤'}
          </div>
          <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center text-sm hover:bg-gray-700 transition-colors">
            📷
          </button>
        </div>
        
        {/* Info */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{user?.name || '사용자'}</h2>
          <p className="text-gray-400 mt-1">{user?.email || 'user@example.com'}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium">
              {role?.name || 'Member'}
            </span>
            <span className="text-gray-500 text-sm">
              가입일: {user?.createdAt || '2024-01-01'}
            </span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '총 로그인', value: '247회' },
            { label: '활동 시간', value: '1,284h' },
            { label: '작업 완료', value: '892건' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center px-4 py-3 bg-gray-800/50 rounded-xl">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// PROFILE FORM
// ============================================
const ProfileForm = memo(function ProfileForm({ profile, onUpdate }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h3 className={`${TOKENS.type.h2} text-white mb-6`}>기본 정보</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">이름</label>
          <input
            type="text"
            value={profile.name || ''}
            onChange={(e) => onUpdate('name', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-2">이메일</label>
          <input
            type="email"
            value={profile.email || ''}
            onChange={(e) => onUpdate('email', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-2">연락처</label>
          <input
            type="tel"
            value={profile.phone || ''}
            onChange={(e) => onUpdate('phone', e.target.value)}
            placeholder="010-0000-0000"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-2">생년월일</label>
          <input
            type="date"
            value={profile.birthday || ''}
            onChange={(e) => onUpdate('birthday', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
        
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-2">소개</label>
          <textarea
            value={profile.bio || ''}
            onChange={(e) => onUpdate('bio', e.target.value)}
            placeholder="자기 소개를 입력하세요"
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
});

// ============================================
// PASSWORD CHANGE
// ============================================
const PasswordChange = memo(function PasswordChange() {
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const handleChange = (key, value) => {
    setPasswords(prev => ({ ...prev, [key]: value }));
    setError('');
  };
  
  const handleSubmit = () => {
    if (!passwords.current) {
      setError('현재 비밀번호를 입력하세요');
      return;
    }
    if (passwords.new.length < 8) {
      setError('새 비밀번호는 8자 이상이어야 합니다');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setError('새 비밀번호가 일치하지 않습니다');
      return;
    }
    
    // TODO: API call to change password
    console.log('Changing password...');
    setPasswords({ current: '', new: '', confirm: '' });
  };
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h3 className={`${TOKENS.type.h2} text-white mb-6`}>비밀번호 변경</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">현재 비밀번호</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={passwords.current}
            onChange={(e) => handleChange('current', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-2">새 비밀번호</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={passwords.new}
            onChange={(e) => handleChange('new', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-2">새 비밀번호 확인</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={passwords.confirm}
            onChange={(e) => handleChange('confirm', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showPassword"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="showPassword" className="text-sm text-gray-400">
            비밀번호 표시
          </label>
        </div>
        
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
        
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
        >
          비밀번호 변경
        </button>
      </div>
    </div>
  );
});

// ============================================
// NOTIFICATION PREFERENCES
// ============================================
const NotificationPreferences = memo(function NotificationPreferences({ prefs, onUpdate }) {
  const options = [
    { id: 'email_notification', label: '이메일 알림', desc: '중요 알림을 이메일로 받습니다' },
    { id: 'push_notification', label: '푸시 알림', desc: '브라우저 푸시 알림을 받습니다' },
    { id: 'kakao_notification', label: '카카오톡 알림', desc: '카카오톡으로 알림을 받습니다' },
    { id: 'marketing', label: '마케팅 수신', desc: '이벤트 및 프로모션 정보를 받습니다' },
  ];
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h3 className={`${TOKENS.type.h2} text-white mb-6`}>알림 설정</h3>
      
      <div className="space-y-3">
        {options.map((opt) => (
          <div 
            key={opt.id}
            className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl"
          >
            <div>
              <p className="text-white font-medium">{opt.label}</p>
              <p className="text-gray-500 text-sm">{opt.desc}</p>
            </div>
            <button
              onClick={() => onUpdate(opt.id, !prefs[opt.id])}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                prefs[opt.id] ? 'bg-cyan-500' : 'bg-gray-700'
              }`}
            >
              <motion.div
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                animate={{ left: prefs[opt.id] ? '1.75rem' : '0.25rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// ACTIVITY LOG
// ============================================
const ActivityLog = memo(function ActivityLog() {
  const activities = [
    { time: '방금 전', action: '프로필 수정', icon: '✏️' },
    { time: '10분 전', action: '대시보드 접속', icon: '📊' },
    { time: '1시간 전', action: '리포트 생성', icon: '📄' },
    { time: '3시간 전', action: '학생 State 변경', icon: '🔄' },
    { time: '어제', action: '결제 확인', icon: '💳' },
  ];
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h3 className={`${TOKENS.type.h2} text-white mb-6`}>최근 활동</h3>
      
      <div className="space-y-3">
        {activities.map((act, idx) => (
          <div 
            key={idx}
            className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl"
          >
            <span className="text-xl">{act.icon}</span>
            <div className="flex-1">
              <p className="text-white text-sm">{act.action}</p>
            </div>
            <span className="text-gray-500 text-xs">{act.time}</span>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-4 py-2 text-gray-400 text-sm hover:text-white transition-colors">
        더 보기 →
      </button>
    </div>
  );
});

// ============================================
// MAIN PROFILE PAGE
// ============================================
export default function ProfilePage() {
  const { role, user } = useAuth();
  
  const [profile, setProfile] = useState({
    name: user?.name || '사용자',
    email: user?.email || 'user@kraton.io',
    phone: '010-1234-5678',
    birthday: '1990-01-01',
    bio: 'KRATON 사용자입니다.',
  });
  
  const [notificationPrefs, setNotificationPrefs] = useState({
    email_notification: true,
    push_notification: true,
    kakao_notification: false,
    marketing: false,
  });
  
  const [saved, setSaved] = useState(false);
  
  const handleProfileUpdate = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };
  
  const handleNotificationUpdate = (key, value) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSave = () => {
    // TODO: Save to backend
    console.log('Saving profile:', profile, notificationPrefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white`}>👤 내 프로필</h1>
          <p className="text-gray-500 mt-1">계정 정보를 관리합니다</p>
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
      
      {/* Profile Header Card */}
      <ProfileHeader user={profile} role={role} />
      
      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-6">
          <ProfileForm profile={profile} onUpdate={handleProfileUpdate} />
          <PasswordChange />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <NotificationPreferences prefs={notificationPrefs} onUpdate={handleNotificationUpdate} />
          <ActivityLog />
        </div>
      </div>
      
      {/* Danger Zone */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-red-500/30">
        <h3 className={`${TOKENS.type.h2} text-red-400 mb-4`}>⚠️ 위험 구역</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">계정 삭제</p>
            <p className="text-gray-500 text-sm">모든 데이터가 영구적으로 삭제됩니다</p>
          </div>
          <button className="px-4 py-2 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
            계정 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
