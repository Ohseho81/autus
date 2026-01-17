/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Onboarding Flow - 온보딩 플로우
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 5단계:
 * 1. 환영 화면
 * 2. 산업 선택
 * 3. SaaS 연결
 * 4. 트리거 설정
 * 5. 완료
 */

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// =============================================================================
// Types
// =============================================================================

interface Industry {
  id: string;
  name: string;
  icon: string;
  triggers: number;
  eliminated: number;
  savings: number;
}

interface SaasService {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

interface Trigger {
  name: string;
  icon: string;
  actions: number;
  eliminated: number;
  desc: string;
}

// =============================================================================
// Constants
// =============================================================================

const INDUSTRIES: Industry[] = [
  { id: '교육', name: '교육', icon: '📚', triggers: 2, eliminated: 28, savings: 4332 },
  { id: '의료', name: '의료', icon: '🏥', triggers: 2, eliminated: 35, savings: 5200 },
  { id: '물류', name: '물류', icon: '📦', triggers: 2, eliminated: 45, savings: 6800 },
  { id: '호텔', name: '호텔', icon: '🏨', triggers: 2, eliminated: 30, savings: 4500 },
  { id: '제조', name: '제조', icon: '🏭', triggers: 3, eliminated: 50, savings: 8000 },
  { id: '유통', name: '유통', icon: '🏪', triggers: 2, eliminated: 40, savings: 5500 },
  { id: '서비스', name: '서비스', icon: '💼', triggers: 2, eliminated: 35, savings: 4800 },
  { id: 'F&B', name: 'F&B', icon: '🍽️', triggers: 2, eliminated: 32, savings: 4200 },
];

const SAAS_ESSENTIAL: SaasService[] = [
  { id: 'google', name: 'Google Workspace', icon: '🔵', desc: '캘린더, 이메일, 드라이브' },
  { id: 'slack', name: 'Slack', icon: '💬', desc: '팀 커뮤니케이션' },
  { id: 'stripe', name: 'Stripe / 토스', icon: '💳', desc: '결제 시스템' },
];

const SAAS_OPTIONAL: SaasService[] = [
  { id: 'notion', name: 'Notion', icon: '📝', desc: '문서 관리' },
  { id: 'github', name: 'GitHub', icon: '🐙', desc: '코드 저장소' },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️', desc: 'CRM' },
  { id: 'zapier', name: 'Zapier', icon: '⚡', desc: '자동화 연결' },
];

const INDUSTRY_TRIGGERS: Record<string, Trigger[]> = {
  '교육': [
    { name: '결제 완료', icon: '💳', actions: 6, eliminated: 15, desc: '수강료 결제 시 전체 등록 프로세스 자동 완료' },
    { name: '수업 수행', icon: '📖', actions: 7, eliminated: 13, desc: '수업 시작 시 출결/기록/리포트 자동 생성' },
  ],
  '의료': [
    { name: '예약 완료', icon: '📅', actions: 5, eliminated: 18, desc: '예약 시 환자등록/차트준비 자동화' },
    { name: '진료 완료', icon: '🩺', actions: 6, eliminated: 17, desc: '진료 후 수납/청구/안내 자동화' },
  ],
  '물류': [
    { name: '주문 접수', icon: '🛒', actions: 5, eliminated: 22, desc: '주문 시 재고/출고/배차 자동 처리' },
    { name: '배송 완료', icon: '🚚', actions: 4, eliminated: 23, desc: '배송 완료 시 POD/정산 자동화' },
  ],
};

// =============================================================================
// Components
// =============================================================================

function ProgressBar({ step, total }: { step: number; total: number }) {
  const progress = (step / total) * 100;
  const labels = ['환영', '산업 선택', '서비스 연결', '트리거 설정', '완료'];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur border border-white/10">
          <span className="text-sm text-white/60">
            {step}/{total} {labels[step - 1]}
          </span>
        </div>
      </div>
    </>
  );
}

function IndustryCard({
  industry,
  selected,
  onSelect,
}: {
  industry: Industry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`p-6 rounded-2xl bg-white/5 backdrop-blur border-2 cursor-pointer transition-all ${
        selected ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-transparent hover:border-white/20'
      }`}
    >
      <span className="text-4xl mb-4 block">{industry.icon}</span>
      <h3 className="font-semibold mb-2">{industry.name}</h3>
      <div className="text-xs text-white/40">
        <span className="text-amber-400">{industry.triggers}</span> 트리거 ·{' '}
        <span className="text-red-400">{industry.eliminated}</span>개 삭제
      </div>
    </motion.div>
  );
}

function SaasCard({
  service,
  connected,
  onToggle,
  essential,
}: {
  service: SaasService;
  connected: boolean;
  onToggle: () => void;
  essential?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        connected ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{service.icon}</span>
        <div>
          <div className="font-medium text-sm">{service.name}</div>
          <div className="text-xs text-white/40">{service.desc}</div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
          connected
            ? 'bg-green-500/20 text-green-300'
            : essential
            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            : 'bg-white/10 text-white/60 hover:bg-white/20'
        }`}
      >
        {connected ? '✓ 연결됨' : '연결'}
      </button>
    </div>
  );
}

function TriggerCard({ trigger, enabled, onToggle }: { trigger: Trigger; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
            <span className="text-3xl">{trigger.icon}</span>
          </div>
          <div>
            <h4 className="font-semibold text-lg">{trigger.name}</h4>
            <p className="text-sm text-white/60">{trigger.desc}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white/20 rounded-full peer peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>
      <div className="flex gap-3">
        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs">
          {trigger.actions}개 액션
        </span>
        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs">
          {trigger.eliminated}개 업무 삭제
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Step Components
// =============================================================================

function Step1Welcome({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
    >
      <div className="text-center mb-12">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 mb-8"
        >
          <span className="text-5xl font-bold">A</span>
        </motion.div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            AUTUS
          </span>
          에 오신 것을 환영합니다
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          트리거 한 번으로 모든 연쇄 작업이 자동 완료됩니다.
          <br />
          개별 업무는 자연스럽게 삭제됩니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-12">
        {[
          { icon: '🎯', title: '트리거 기반', desc: '결제, 수업 등 핵심 이벤트가 모든 것을 자동화' },
          { icon: '⚡', title: '체인 자동화', desc: '하나의 트리거가 전체 업무 체인을 실행' },
          { icon: '🗑️', title: '업무 삭제', desc: '자동화가 아닌 삭제, 업무가 사라집니다' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 text-center"
          >
            <span className="text-4xl mb-4 block">{item.icon}</span>
            <h3 className="font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-white/60">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="text-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 font-semibold text-lg shadow-lg shadow-amber-500/30"
        >
          시작하기 →
        </motion.button>
        <p className="mt-4 text-sm text-white/40">3분이면 설정이 완료됩니다</p>
      </div>
    </motion.div>
  );
}

function Step2Industry({
  selected,
  onSelect,
  onNext,
  onPrev,
}: {
  selected: Industry | null;
  onSelect: (industry: Industry) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">어떤 산업에서 일하시나요?</h2>
        <p className="text-white/60">산업에 맞는 턴키 솔루션을 제공해 드립니다</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {INDUSTRIES.map((industry) => (
          <IndustryCard
            key={industry.id}
            industry={industry}
            selected={selected?.id === industry.id}
            onSelect={() => onSelect(industry)}
          />
        ))}
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20">
          ← 이전
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-semibold disabled:opacity-50"
        >
          다음 →
        </button>
      </div>
    </motion.div>
  );
}

function Step3Saas({
  connected,
  onToggle,
  onNext,
  onPrev,
}: {
  connected: Set<string>;
  onToggle: (id: string) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">사용 중인 서비스 연결</h2>
        <p className="text-white/60">연결된 서비스의 데이터를 기반으로 업무를 자동 발견합니다</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="text-amber-400">⭐</span> 필수 연동
          </h3>
          <div className="space-y-3">
            {SAAS_ESSENTIAL.map((s) => (
              <SaasCard
                key={s.id}
                service={s}
                connected={connected.has(s.id)}
                onToggle={() => onToggle(s.id)}
                essential
              />
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-400">📎</span> 선택 연동
          </h3>
          <div className="space-y-3">
            {SAAS_OPTIONAL.map((s) => (
              <SaasCard key={s.id} service={s} connected={connected.has(s.id)} onToggle={() => onToggle(s.id)} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20">
          ← 이전
        </button>
        <button onClick={onNext} className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-semibold">
          다음 →
        </button>
      </div>
    </motion.div>
  );
}

function Step4Triggers({
  industry,
  onNext,
  onPrev,
}: {
  industry: Industry;
  onNext: () => void;
  onPrev: () => void;
}) {
  const triggers = INDUSTRY_TRIGGERS[industry.id] || INDUSTRY_TRIGGERS['교육'];
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(triggers.map((t) => [t.name, true]))
  );

  const totalEliminated = triggers.filter((t) => enabled[t.name]).reduce((sum, t) => sum + t.eliminated, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">핵심 트리거 확인</h2>
        <p className="text-white/60">{industry.name} 산업의 핵심 트리거입니다</p>
      </div>

      <div className="space-y-4 mb-8">
        {triggers.map((trigger) => (
          <TriggerCard
            key={trigger.name}
            trigger={trigger}
            enabled={enabled[trigger.name]}
            onToggle={() => setEnabled((prev) => ({ ...prev, [trigger.name]: !prev[trigger.name] }))}
          />
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-green-300 mb-1">예상 효과</h4>
            <p className="text-sm text-white/60">
              {triggers.filter((t) => enabled[t.name]).length}개 트리거로 {totalEliminated}개 업무 삭제, 연 ₩
              {industry.savings}만 절감
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-400">₩{industry.savings}만</div>
            <div className="text-xs text-white/40">연간 절감 예상</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20">
          ← 이전
        </button>
        <button onClick={onNext} className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-semibold">
          설정 완료 →
        </button>
      </div>
    </motion.div>
  );
}

function Step5Complete({ industry }: { industry: Industry }) {
  const triggers = INDUSTRY_TRIGGERS[industry.id] || INDUSTRY_TRIGGERS['교육'];
  const totalEliminated = triggers.reduce((sum, t) => sum + t.eliminated, 0);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="relative inline-block mb-8"
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
            <span className="text-6xl">✓</span>
          </div>
          <motion.div
            className="absolute inset-0 rounded-full bg-green-400/30"
            animate={{ scale: [1, 1.5], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        <h2 className="text-4xl font-bold mb-4">설정 완료!</h2>
        <p className="text-xl text-white/60 mb-8">{industry.name} 산업 턴키 솔루션이 준비되었습니다</p>

        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-12">
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 text-center">
            <div className="text-3xl font-bold text-amber-400 mb-2">{triggers.length}</div>
            <div className="text-sm text-white/60">핵심 트리거</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 text-center">
            <div className="text-3xl font-bold text-red-400 mb-2">{totalEliminated}</div>
            <div className="text-sm text-white/60">삭제될 업무</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">₩{industry.savings}만</div>
            <div className="text-sm text-white/60">연간 절감</div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <a
            href="/dashboard"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 font-semibold text-lg shadow-lg shadow-amber-500/30"
          >
            대시보드로 이동 →
          </a>
          <a href="/admin" className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold text-lg">
            관리자 콘솔
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [connectedSaas, setConnectedSaas] = useState<Set<string>>(new Set());

  const toggleSaas = useCallback((id: string) => {
    setConnectedSaas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <ProgressBar step={step} total={5} />

      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <AnimatePresence mode="wait">
            {step === 1 && <Step1Welcome key="step1" onNext={nextStep} />}
            {step === 2 && (
              <Step2Industry
                key="step2"
                selected={selectedIndustry}
                onSelect={setSelectedIndustry}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {step === 3 && (
              <Step3Saas key="step3" connected={connectedSaas} onToggle={toggleSaas} onNext={nextStep} onPrev={prevStep} />
            )}
            {step === 4 && selectedIndustry && (
              <Step4Triggers key="step4" industry={selectedIndustry} onNext={nextStep} onPrev={prevStep} />
            )}
            {step === 5 && selectedIndustry && <Step5Complete key="step5" industry={selectedIndustry} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
