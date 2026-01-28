/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🦎 Kraton 원클릭 설정 가이드
 * API 키 입력만 하면 바로 사용 가능
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, ExternalLink, Key, CheckCircle, 
  Copy, ArrowRight, Zap, CreditCard
} from 'lucide-react';
import { setApiKey, getSettings } from './api';

interface SetupGuideProps {
  onComplete: () => void;
}

export function SetupGuide({ onComplete }: SetupGuideProps) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [step, setStep] = useState(1);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!apiKeyInput.trim()) {
      setError('API 키를 입력해주세요');
      return;
    }
    
    if (!apiKeyInput.startsWith('sk-or-')) {
      setError('올바른 OpenRouter API 키 형식이 아닙니다 (sk-or-로 시작)');
      return;
    }

    setIsValidating(true);
    setError('');

    // Validate API key
    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${apiKeyInput.trim()}` }
      });
      
      if (response.ok) {
        setApiKey(apiKeyInput.trim());
        setStep(3);
        setTimeout(onComplete, 1500);
      } else {
        setError('유효하지 않은 API 키입니다');
      }
    } catch (e) {
      // If validation fails, still save (might be network issue)
      setApiKey(apiKeyInput.trim());
      setStep(3);
      setTimeout(onComplete, 1500);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 text-3xl"
        >
          🦎
        </motion.div>
        <h2 className="text-lg font-bold text-white">Kraton AI 활성화</h2>
        <p className="text-sm text-slate-400 mt-1">Claude 3.5 Sonnet 연동 (3분 완료)</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= s 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              {step > s ? <CheckCircle size={16} /> : s}
            </div>
            {s < 3 && (
              <div className={`w-8 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[200px]">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2">
                <CreditCard size={16} />
                Step 1: OpenRouter 크레딧 충전
              </div>
              <p className="text-sm text-slate-300 mb-3">
                아래 버튼을 클릭하여 $5 충전하세요.<br/>
                (Claude 3.5 약 50,000 토큰 사용 가능)
              </p>
              <motion.a
                href="https://openrouter.ai/credits"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium"
              >
                크레딧 충전하러 가기 <ExternalLink size={16} />
              </motion.a>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium flex items-center justify-center gap-2"
            >
              충전 완료 <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2">
                <Key size={16} />
                Step 2: API 키 발급 & 입력
              </div>
              <p className="text-sm text-slate-300 mb-3">
                아래 버튼으로 키를 발급받고 복사하세요.
              </p>
              <motion.a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm mb-3"
              >
                API 키 발급받기 <ExternalLink size={14} />
              </motion.a>

              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full bg-slate-900 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-emerald-500 outline-none font-mono"
              />
              {error && (
                <p className="text-xs text-red-400 mt-2">{error}</p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isValidating}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isValidating ? (
                <>검증 중...</>
              ) : (
                <>활성화 <Zap size={16} /></>
              )}
            </motion.button>

            <button
              onClick={() => setStep(1)}
              className="w-full text-center text-sm text-slate-400 hover:text-white"
            >
              ← 이전 단계
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="w-20 h-20 mx-auto rounded-full bg-emerald-500 flex items-center justify-center"
            >
              <CheckCircle size={40} className="text-white" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-white">설정 완료!</h3>
              <p className="text-sm text-slate-400 mt-1">
                Kraton이 Claude 3.5 Sonnet으로 업그레이드되었습니다
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-xs text-emerald-400">
                🧠 IQ 150 모드 활성화
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Skip Option */}
      {step < 3 && (
        <div className="text-center">
          <button
            onClick={onComplete}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            나중에 설정 (데모 모드로 사용)
          </button>
        </div>
      )}
    </div>
  );
}

export default SetupGuide;
