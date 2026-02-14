/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS MyPage - 마이페이지
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 섹션:
 * 1. 프로필
 * 2. 연동 서비스
 * 3. 실행 이력
 * 4. 설정
 * 5. 구독
 * 6. 보안
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// =============================================================================
// Types
// =============================================================================

interface Integration {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  lastSync?: string;
}

interface ExecutionHistory {
  id: string;
  type: string;
  success: boolean;
  eliminated: number;
  duration: number;
  timestamp: Date;
}

type Section = 'profile' | 'integrations' | 'history' | 'settings' | 'subscription' | 'security';

// =============================================================================
// Data
// =============================================================================

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: 'google', name: 'Google Workspace', icon: '🔵', connected: true, lastSync: '5분 전' },
  { id: 'slack', name: 'Slack', icon: '💬', connected: true, lastSync: '10분 전' },
  { id: 'stripe', name: 'Stripe', icon: '💳', connected: true, lastSync: '1시간 전' },
  { id: 'notion', name: 'Notion', icon: '📝', connected: true, lastSync: '30분 전' },
  { id: 'github', name: 'GitHub', icon: '🐙', connected: true, lastSync: '2시간 전' },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️', connected: false },
  { id: 'hubspot', name: 'HubSpot', icon: '🧡', connected: false },
  { id: 'zapier', name: 'Zapier', icon: '⚡', connected: false },
];

function generateHistory(): ExecutionHistory[] {
  const types = ['결제 완료', '수업 수행'];
  return Array.from({ length: 30 }, (_, i) => ({
    id: `exec_${i}`,
    type: types[Math.floor(Math.random() * types.length)],
    success: Math.random() > 0.02,
    eliminated: types[0] === '결제 완료' ? 15 : 13,
    duration: Math.floor(300 + Math.random() * 500),
    timestamp: new Date(Date.now() - i * 3600000 * Math.random() * 24),
  }));
}

// =============================================================================
// Components
// =============================================================================

function NavItem({
  icon,
  label,
  active,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        active
          ? 'bg-amber-500/20 border-amber-500/50'
          : danger
          ? 'text-red-400 hover:bg-red-500/10 border-transparent'
          : 'hover:bg-white/10 border-transparent'
      }`}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors ${on ? 'bg-amber-500' : 'bg-white/20'}`}
    >
      <motion.div
        className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white"
        animate={{ x: on ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function IntegrationCard({
  integration,
  onToggle,
}: {
  integration: Integration;
  onToggle: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10 flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
          {integration.icon}
        </div>
        <div>
          <div className="font-medium">{integration.name}</div>
          {integration.connected ? (
            <div className="text-xs text-green-400">연결됨 · {integration.lastSync}</div>
          ) : (
            <div className="text-xs text-white/40">연결 안 됨</div>
          )}
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
          integration.connected
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
        }`}
      >
        {integration.connected ? '연결 해제' : '연결'}
      </button>
    </motion.div>
  );
}

function HistoryItem({ item }: { item: ExecutionHistory }) {
  const time = item.timestamp.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border-b border-white/5">
      <span className="text-xl">{item.success ? '✅' : '❌'}</span>
      <div className="flex-1">
        <div className="font-medium">{item.type}</div>
        <div className="text-xs text-white/40">{time}</div>
      </div>
      <div className="text-right">
        <div className="text-sm">{item.eliminated}개 삭제</div>
        <div className="text-xs text-white/40">{item.duration}ms</div>
      </div>
    </div>
  );
}

// =============================================================================
// Section Components
// =============================================================================

function ProfileSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold">프로필</h2>

      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-4xl font-bold">
              세
            </div>
            <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm">
              📷
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold">오세호</h3>
              <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs">Pro</span>
            </div>
            <p className="text-white/60 mb-4">admin@autus.io</p>
            <div className="flex gap-4 text-sm">
              <div className="px-3 py-2 rounded-lg bg-white/5">
                <span className="text-white/40">산업</span>
                <span className="ml-2 text-amber-400">교육</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white/5">
                <span className="text-white/40">가입일</span>
                <span className="ml-2">2024.01.15</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white/5">
                <span className="text-white/40">총 실행</span>
                <span className="ml-2 text-green-400">1,247회</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
          <h4 className="font-semibold mb-4">기본 정보</h4>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/40 block mb-1">이름</label>
              <input
                type="text"
                defaultValue="오세호"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-sm text-white/40 block mb-1">이메일</label>
              <input
                type="email"
                defaultValue="admin@autus.io"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 outline-none focus:border-amber-500"
              />
            </div>
            <button className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 font-medium">저장</button>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
          <h4 className="font-semibold mb-4">이번 달 사용량</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">트리거 실행</span>
                <span>247 / 1,000</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '24.7%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">연동 서비스</span>
                <span>5 / 10</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '50%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">삭제된 업무</span>
                <span className="text-green-400">28개 (₩4,332만 절감)</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function IntegrationsSection({
  integrations,
  onToggle,
}: {
  integrations: Integration[];
  onToggle: (id: string) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">연동 서비스</h2>
        <button className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 font-medium">+ 새 연동 추가</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {integrations.map((int) => (
          <IntegrationCard key={int.id} integration={int} onToggle={() => onToggle(int.id)} />
        ))}
      </div>
    </motion.div>
  );
}

function HistorySection({ history }: { history: ExecutionHistory[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">실행 이력</h2>
        <div className="flex gap-2">
          <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none">
            <option>전체 트리거</option>
            <option>결제 완료</option>
            <option>수업 수행</option>
          </select>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { value: '247', label: '총 실행', color: 'text-amber-400' },
            { value: '98.5%', label: '성공률', color: 'text-green-400' },
            { value: '1,842', label: '삭제 업무', color: 'text-blue-400' },
            { value: '423ms', label: '평균 시간', color: 'text-purple-400' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl bg-white/5 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {history.map((item) => (
            <HistoryItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function SettingsSection() {
  const [notifications, setNotifications] = useState({
    trigger: true,
    error: true,
    weekly: false,
    elimination: true,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-2xl font-bold">설정</h2>

      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
        <h4 className="font-semibold mb-4">알림 설정</h4>
        <div className="space-y-4">
          {[
            { key: 'trigger', title: '트리거 실행 알림', desc: '트리거가 실행될 때마다 알림' },
            { key: 'error', title: '오류 알림', desc: '실행 실패 시 즉시 알림' },
            { key: 'weekly', title: '주간 리포트', desc: '매주 월요일 실행 요약 이메일' },
            { key: 'elimination', title: '삭제 리포트', desc: '업무 삭제 시 상세 리포트' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-white/40">{item.desc}</div>
              </div>
              <Toggle
                on={notifications[item.key as keyof typeof notifications]}
                onToggle={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key as keyof typeof notifications],
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function SubscriptionSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-2xl font-bold">구독</h2>

      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-amber-500 text-black text-sm font-medium">Pro Plan</span>
            <h3 className="text-2xl font-bold mt-2">
              ₩99,000 <span className="text-sm font-normal text-white/60">/ 월</span>
            </h3>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/40">다음 결제일</div>
            <div className="font-medium">2024.02.15</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { value: '1,000', label: '월 실행 횟수' },
            { value: '10', label: '연동 서비스' },
            { value: '∞', label: '삭제 업무' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-white/10">
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-sm text-white/40">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30">플랜 변경</button>
          <button className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10">구독 취소</button>
        </div>
      </div>
    </motion.div>
  );
}

function SecuritySection() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-2xl font-bold">보안</h2>

      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
        <h4 className="font-semibold mb-4">비밀번호 변경</h4>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-sm text-white/40 block mb-1">현재 비밀번호</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-sm text-white/40 block mb-1">새 비밀번호</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 outline-none focus:border-amber-500"
            />
          </div>
          <button className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 font-medium">변경하기</button>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
        <h4 className="font-semibold mb-4">API 키</h4>
        <div className="space-y-4">
          {[
            { name: 'Production Key', key: 'sk_live_••••••••••••4f3d' },
            { name: 'Test Key', key: 'sk_test_••••••••••••8a2b' },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-white/40 font-mono">{item.key}</div>
              </div>
              <button className="text-sm text-amber-400 hover:text-amber-300">복사</button>
              <button className="text-sm text-red-400 hover:text-red-300">재생성</button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
        <h4 className="font-semibold mb-4 text-red-400">위험 영역</h4>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">계정 삭제</div>
            <div className="text-sm text-white/40">모든 데이터가 영구적으로 삭제됩니다</div>
          </div>
          <button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">계정 삭제</button>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function MyPage() {
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [history] = useState(generateHistory);

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id ? { ...int, connected: !int.connected, lastSync: int.connected ? undefined : '방금' } : int
      )
    );
  };

  const NAV_ITEMS: { section: Section; icon: string; label: string }[] = [
    { section: 'profile', icon: '👤', label: '프로필' },
    { section: 'integrations', icon: '🔗', label: '연동 서비스' },
    { section: 'history', icon: '📋', label: '실행 이력' },
    { section: 'settings', icon: '⚙️', label: '설정' },
    { section: 'subscription', icon: '💳', label: '구독' },
    { section: 'security', icon: '🔒', label: '보안' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-bold">
              A
            </div>
            <span className="text-xl font-semibold">온리쌤</span>
          </a>
          <nav className="flex items-center gap-4">
            <a href="/dashboard" className="px-4 py-2 rounded-lg hover:bg-white/10 text-white/60">
              대시보드
            </a>
            <a href="/mypage" className="px-4 py-2 rounded-lg bg-white/10 text-white">
              마이페이지
            </a>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="col-span-1">
            <div className="sticky top-24 space-y-2">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.section}
                  icon={item.icon}
                  label={item.label}
                  active={activeSection === item.section}
                  onClick={() => setActiveSection(item.section)}
                />
              ))}
              <div className="pt-4 border-t border-white/10 mt-4">
                <NavItem icon="🚪" label="로그아웃" onClick={() => {}} danger />
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="col-span-3">
            <AnimatePresence mode="wait">
              {activeSection === 'profile' && <ProfileSection key="profile" />}
              {activeSection === 'integrations' && (
                <IntegrationsSection key="integrations" integrations={integrations} onToggle={toggleIntegration} />
              )}
              {activeSection === 'history' && <HistorySection key="history" history={history} />}
              {activeSection === 'settings' && <SettingsSection key="settings" />}
              {activeSection === 'subscription' && <SubscriptionSection key="subscription" />}
              {activeSection === 'security' && <SecuritySection key="security" />}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
