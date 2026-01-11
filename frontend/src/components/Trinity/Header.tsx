/**
 * AUTUS Trinity - Header Component
 * 최소화된 헤더 (역할 선택 버튼 제거)
 */

import React, { memo, useEffect } from 'react';
import { useTrinityStore, selectRole, selectIsConnected } from '../../stores/trinityStore';
import { ROLE_SYMBOLS, ROLE_COLORS, ROLE_LABELS } from './constants';
import { Role } from './types';

interface HeaderProps {
  userName?: string;
}

const Header = memo(function Header({ userName = '오세호' }: HeaderProps) {
  const role = useTrinityStore(selectRole);
  const setRole = useTrinityStore(state => state.setRole);
  const isConnected = useTrinityStore(selectIsConnected);

  // URL 파라미터로 역할 결정 (예: ?role=worker)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role') as Role | null;
    
    if (roleParam && ['architect', 'analyst', 'worker'].includes(roleParam)) {
      setRole(roleParam);
    }
    
    // 해시에서도 역할 확인 (예: #trinity/worker)
    const hash = window.location.hash;
    if (hash.includes('/')) {
      const parts = hash.split('/');
      const hashRole = parts[1]?.split('?')[0] as Role;
      if (['architect', 'analyst', 'worker'].includes(hashRole)) {
        setRole(hashRole);
      }
    }
  }, [setRole]);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-black/30 border-b border-white/5 backdrop-blur-lg">
      {/* 로고 + 현재 역할 */}
      <div className="flex items-center gap-4">
        <div className="text-[15px] font-light">
          AUTUS{' '}
          <b className="font-bold bg-gradient-to-r from-[#fbbf24] via-[#a78bfa] to-[#4ade80] bg-clip-text text-transparent">
            Trinity
          </b>
        </div>
        
        {/* 연결 상태 */}
        <div 
          className={`w-2 h-2 rounded-full transition-colors ${
            isConnected ? 'bg-[#4ade80]' : 'bg-[#f87171]'
          }`}
          title={isConnected ? '실시간 연결됨' : '오프라인'}
        />
      </div>

      {/* 현재 역할 표시 (선택 버튼 없음) */}
      <div 
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5"
        style={{ borderColor: `${ROLE_COLORS[role]}30` }}
      >
        <span className="text-lg">{ROLE_SYMBOLS[role]}</span>
        <div className="flex flex-col">
          <span className="text-[10px] text-white/40">현재 모드</span>
          <span 
            className="text-xs font-semibold"
            style={{ color: ROLE_COLORS[role] }}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>
      </div>

      {/* 사용자 프로필 */}
      <div className="flex items-center gap-2.5">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-white/50">{userName}</div>
          <div className="text-[9px] text-white/30">Pro Member</div>
        </div>
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[14px] font-semibold shadow-lg">
          <span className="absolute -top-1 -right-1 text-sm">{ROLE_SYMBOLS[role]}</span>
          {userName.charAt(0)}
        </div>
      </div>
    </header>
  );
});

export default Header;
