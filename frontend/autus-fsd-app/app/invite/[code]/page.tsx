'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Check, AlertCircle, Building2, GraduationCap, Settings,
  Loader2, ArrowRight, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// ============================================
// Types
// ============================================

interface InvitationData {
  id: string;
  academyId: string;
  academyName: string;
  email: string;
  name: string;
  role: 'principal' | 'teacher' | 'admin';
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
}

type PageState = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'completing';

// ============================================
// Constants
// ============================================

const ROLE_INFO = {
  principal: {
    name: '원장',
    icon: <Building2 className="w-6 h-6" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    desc: '학원 전체 관리, 직원 초대, 설정 변경',
  },
  teacher: {
    name: '강사',
    icon: <GraduationCap className="w-6 h-6" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    desc: '담당 학생 관리, 출결 체크, 수업 일지',
  },
  admin: {
    name: '행정',
    icon: <Settings className="w-6 h-6" />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    desc: '수납 관리, 상담 기록, 데이터 입력',
  },
};

// ============================================
// Main Page
// ============================================

export default function InvitePage() {
  const params = useParams();
  const inviteCode = params.code as string;
  
  const [state, setState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Simulate fetching invitation data
    const fetchInvitation = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - 실제로는 API 호출
      if (inviteCode && inviteCode.length > 8) {
        // Valid invitation
        setInvitation({
          id: 'inv-1',
          academyId: 'academy-1',
          academyName: '서초영재수학학원',
          email: 'teacher@example.com',
          name: '김선생',
          role: 'teacher',
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        setState('valid');
      } else if (inviteCode === 'expired') {
        setState('expired');
      } else {
        setState('invalid');
      }
    };

    fetchInvitation();
  }, [inviteCode]);

  const handleAccept = async () => {
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setState('completing');
    setError('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 실제로는 Supabase에 사용자 생성 + role_assignments 추가
    setState('accepted');
  };

  // Loading State
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#05050a] text-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-cyan-400" />
        </motion.div>
      </div>
    );
  }

  // Invalid State
  if (state === 'invalid') {
    return (
      <div className="min-h-screen bg-[#05050a] text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">유효하지 않은 초대</h1>
          <p className="text-gray-400 mb-6">
            초대 링크가 올바르지 않거나 이미 사용되었습니다.
          </p>
          <Link href="/">
            <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
              홈으로 이동
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // Expired State
  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-[#05050a] text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">초대가 만료되었습니다</h1>
          <p className="text-gray-400 mb-6">
            초대 링크가 만료되었습니다. 관리자에게 새 초대를 요청하세요.
          </p>
          <Link href="/">
            <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
              홈으로 이동
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // Accepted State
  if (state === 'accepted') {
    const roleInfo = invitation ? ROLE_INFO[invitation.role] : ROLE_INFO.teacher;
    
    return (
      <div className="min-h-screen bg-[#05050a] text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center"
          >
            <Check className="w-12 h-12 text-black" />
          </motion.div>
          
          <h1 className="text-2xl font-black mb-2">🎉 가입 완료!</h1>
          <p className="text-gray-400 mb-6">
            <span className="text-cyan-400 font-bold">{invitation?.academyName}</span>에
            <span className={`${roleInfo.color} font-bold`}> {roleInfo.name}</span>으로 등록되었습니다.
          </p>
          
          <div className="bg-gray-900/50 rounded-xl p-4 mb-6 text-left">
            <div className={`${roleInfo.bg} rounded-lg p-4 flex items-center gap-3`}>
              <div className={roleInfo.color}>{roleInfo.icon}</div>
              <div>
                <p className={`font-semibold ${roleInfo.color}`}>{roleInfo.name}</p>
                <p className="text-xs text-gray-400">{roleInfo.desc}</p>
              </div>
            </div>
          </div>
          
          <Link href="/">
            <button className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              대시보드로 이동
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // Valid State - Show Form
  const roleInfo = invitation ? ROLE_INFO[invitation.role] : ROLE_INFO.teacher;

  return (
    <div className="min-h-screen bg-[#05050a] text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto mb-4 ${roleInfo.bg} rounded-2xl flex items-center justify-center`}>
            <div className={roleInfo.color}>{roleInfo.icon}</div>
          </div>
          <h1 className="text-xl font-bold mb-2">초대가 도착했습니다!</h1>
          <p className="text-gray-400 text-sm">
            <span className="text-white font-semibold">{invitation?.academyName}</span>에서
            <span className={`${roleInfo.color} font-semibold`}> {roleInfo.name}</span> 역할로 초대했습니다.
          </p>
        </div>

        {/* Invitation Info */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 mb-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">학원</span>
              <span className="font-semibold">{invitation?.academyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">이름</span>
              <span className="font-semibold">{invitation?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">이메일</span>
              <span className="font-mono text-sm">{invitation?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">역할</span>
              <span className={`${roleInfo.color} font-semibold`}>{roleInfo.name}</span>
            </div>
          </div>
        </div>

        {/* Password Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">비밀번호 설정</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 재입력"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleAccept}
          disabled={state === 'completing'}
          className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
            state === 'completing'
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          {state === 'completing' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              처리 중...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              초대 수락하기
            </>
          )}
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-4">
          수락하면 <span className="text-cyan-400">{invitation?.academyName}</span>의
          <span className={roleInfo.color}> {roleInfo.name}</span>으로 등록됩니다.
        </p>
      </motion.div>
    </div>
  );
}
