/**
 * LoginPage.jsx
 * 로그인 페이지 - Supabase 인증 + 역할 선택
 */

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/supabase/auth';
import GlassCard from '../../components/ui/GlassCard';

// ============================================
// 역할 선택 카드
// ============================================
const RoleCard = memo(function RoleCard({ role, isHovered, onClick, onHover }) {
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => onHover(role.id)}
      onMouseLeave={() => onHover(null)}
      className="relative p-6 rounded-2xl bg-gray-900 border border-gray-800
        hover:border-gray-600 hover:bg-gray-800/50
        flex flex-col items-center text-center transition-all duration-200"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="text-4xl mb-3">{role.icon}</span>
      <h3 className="text-sm font-medium text-white">{role.name}</h3>
      <p className="text-xs text-gray-500 mt-1">{role.desc}</p>
      
      {/* 자동화율 뱃지 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.9,
        }}
        className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold 
          bg-gradient-to-r from-blue-600 to-purple-600 text-white"
      >
        {role.automation} 자동화
      </motion.div>
    </motion.button>
  );
});

// ============================================
// 이메일 로그인 폼
// ============================================
const EmailLoginForm = memo(function EmailLoginForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email, password, isSignUp);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-gray-900/60 border border-white/10
            text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50
            transition-all duration-200"
          required
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-gray-900/60 border border-white/10
            text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50
            transition-all duration-200"
          required
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
          text-white font-medium hover:opacity-90 transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
      </button>

      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
      </button>
    </form>
  );
});

// ============================================
// OAuth 버튼
// ============================================
const OAuthButtons = memo(function OAuthButtons({ onOAuth, loading }) {
  const providers = [
    { id: 'kakao', name: '카카오', icon: '💬', primary: true },
    { id: 'google', name: 'Google', icon: '🔵' },
    { id: 'github', name: 'GitHub', icon: '⚫' },
  ];

  return (
    <div className="space-y-2">
      {providers.map(provider => (
        <button
          key={provider.id}
          onClick={() => onOAuth(provider.id)}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg border transition-all duration-200
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${provider.primary
              ? 'bg-[#FEE500] border-[#FEE500] text-[#191919] hover:bg-[#fdd835]'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
        >
          <span>{provider.icon}</span>
          <span>{provider.name}로 계속하기</span>
        </button>
      ))}
    </div>
  );
});

// ============================================
// 메인 로그인 페이지
// ============================================
export default function LoginPage() {
  const { 
    signIn, 
    signUp, 
    signInWithOAuth, 
    selectRole, 
    loading, 
    error, 
    roles,
    isSupabaseMode,
  } = useAuth();
  
  const [hoveredRole, setHoveredRole] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleEmailSubmit = async (email, password, isSignUp) => {
    if (isSignUp) {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
  };

  const handleOAuth = async (provider) => {
    await signInWithOAuth(provider);
  };

  const handleRoleSelect = (roleId) => {
    selectRole(roleId);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* 로고 */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="inline-flex items-center justify-center w-20 h-20 
              bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 
              shadow-2xl shadow-blue-500/20"
          >
            <span className="text-4xl">🏛️</span>
          </motion.div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 
            bg-clip-text text-transparent">
            KRATON
          </h1>
          <p className="text-gray-500 mt-2">The Physics of Business Intelligence</p>
        </div>

        {/* Supabase 모드: 이메일/OAuth 로그인 */}
        {isSupabaseMode && showEmailForm ? (
          <GlassCard className="max-w-md mx-auto p-8">
            <h2 className="text-xl font-bold text-center mb-6">로그인</h2>
            
            <EmailLoginForm 
              onSubmit={handleEmailSubmit}
              loading={loading}
              error={error}
            />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-950 text-gray-500">또는</span>
              </div>
            </div>

            <OAuthButtons onOAuth={handleOAuth} loading={loading} />

            <button
              onClick={() => setShowEmailForm(false)}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-300"
            >
              ← 역할 선택으로 돌아가기
            </button>
          </GlassCard>
        ) : (
          <>
            {/* 역할 선택 */}
            <div className="mb-8">
              <h2 className="text-center text-gray-400 mb-6">역할을 선택하세요</h2>
              <div className="grid grid-cols-5 gap-4">
                {Object.values(roles).map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    isHovered={hoveredRole === role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    onHover={setHoveredRole}
                  />
                ))}
              </div>
            </div>

            {/* Supabase 모드: 이메일 로그인 버튼 */}
            {isSupabaseMode && (
              <div className="text-center">
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  이메일로 로그인 →
                </button>
              </div>
            )}
          </>
        )}

        {/* 푸터 */}
        <p className="text-gray-600 text-center mt-12 text-sm">
          V = (T × M × s)<sup>t</sup> · Build on the Rock
        </p>
      </div>
    </div>
  );
}
