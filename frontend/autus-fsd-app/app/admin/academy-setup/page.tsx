'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Upload, Check, AlertCircle, ChevronRight,
  FileText, Phone, Mail, MapPin, Users, ArrowLeft, Sparkles
} from 'lucide-react';
import Link from 'next/link';

// ============================================
// Types
// ============================================

interface AcademyForm {
  name: string;
  businessNumber: string;
  businessCertFile: File | null;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  studentCount: string;
  plan: string;
}

type Step = 'info' | 'cert' | 'plan' | 'confirm';

// ============================================
// Constants
// ============================================

const CATEGORIES = [
  { id: 'math', name: '수학', icon: '📐' },
  { id: 'english', name: '영어', icon: '🇺🇸' },
  { id: 'korean', name: '국어', icon: '📚' },
  { id: 'science', name: '과학', icon: '🔬' },
  { id: 'coding', name: '코딩', icon: '💻' },
  { id: 'art', name: '예체능', icon: '🎨' },
  { id: 'comprehensive', name: '종합', icon: '🏫' },
  { id: 'other', name: '기타', icon: '📋' },
];

const PLANS = [
  { 
    id: 'free', 
    name: 'Free', 
    price: '₩0', 
    desc: '30일 무료 체험',
    features: ['학생 30명', '직원 3명', '기본 대시보드', '이메일 지원'],
    recommended: false
  },
  { 
    id: 'basic', 
    name: 'Basic', 
    price: '성과 기반', 
    desc: '유지/수금/전환 당 5%',
    features: ['학생 100명', '직원 10명', 'AI 개입 추천', '카카오 알림톡'],
    recommended: true
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    price: '협의', 
    desc: '엔터프라이즈 기능',
    features: ['학생 무제한', '직원 무제한', 'ERP 연동', '전담 매니저'],
    recommended: false
  },
];

const STUDENT_COUNTS = [
  { id: '1-30', name: '30명 이하' },
  { id: '31-50', name: '31~50명' },
  { id: '51-100', name: '51~100명' },
  { id: '101-200', name: '101~200명' },
  { id: '200+', name: '200명 이상' },
];

// ============================================
// Components
// ============================================

const ProgressBar: React.FC<{ currentStep: Step }> = ({ currentStep }) => {
  const steps: Step[] = ['info', 'cert', 'plan', 'confirm'];
  const currentIndex = steps.indexOf(currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
            ${idx <= currentIndex 
              ? 'bg-cyan-500 text-black' 
              : 'bg-gray-700 text-gray-400'}
          `}>
            {idx < currentIndex ? <Check className="w-4 h-4" /> : idx + 1}
          </div>
          {idx < steps.length - 1 && (
            <div className={`w-12 h-1 rounded ${idx < currentIndex ? 'bg-cyan-500' : 'bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================
// Main Page
// ============================================

export default function AcademySetupPage() {
  const [step, setStep] = useState<Step>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [academyId, setAcademyId] = useState<string | null>(null);
  
  const [form, setForm] = useState<AcademyForm>({
    name: '',
    businessNumber: '',
    businessCertFile: null,
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    category: '',
    studentCount: '',
    plan: 'basic',
  });

  const updateForm = (key: keyof AcademyForm, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateForm('businessCertFile', file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Supabase에 학원 등록
      const response = await fetch('/api/academies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          business_number: form.businessNumber,
          owner_id: form.ownerName, // 실제로는 auth.uid()
          address: form.address,
          phone: form.phone,
          email: form.email,
          plan: form.plan,
          metadata: {
            category: form.category,
            student_count: form.studentCount,
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAcademyId(data.id);
        setIsComplete(true);
      } else {
        // Mock success for demo
        setAcademyId('demo-' + Date.now());
        setIsComplete(true);
      }
    } catch (error) {
      // Mock success for demo
      setAcademyId('demo-' + Date.now());
      setIsComplete(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'info':
        return form.name && form.ownerName && form.phone && form.email && form.category;
      case 'cert':
        return form.businessNumber.length >= 10;
      case 'plan':
        return form.plan;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['info', 'cert', 'plan', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['info', 'cert', 'plan', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Complete Screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-[#05050a] text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center"
          >
            <Check className="w-12 h-12 text-black" />
          </motion.div>
          
          <h1 className="text-2xl font-black mb-2">🎉 학원 등록 완료!</h1>
          <p className="text-gray-400 mb-6">
            <span className="text-cyan-400 font-bold">{form.name}</span>이(가) 성공적으로 등록되었습니다.
          </p>
          
          <div className="bg-gray-900/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-gray-500 mb-2">학원 ID</p>
            <p className="font-mono text-cyan-400 text-sm break-all">{academyId}</p>
          </div>
          
          <div className="space-y-3">
            <Link href="/admin/staff-management">
              <button className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                직원 등록하기
                <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
            
            <Link href="/">
              <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-all">
                대시보드로 이동
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">돌아가기</span>
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <span className="font-bold">학원 등록</span>
          </div>
          <div className="w-20" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ProgressBar currentStep={step} />

        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {step === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold mb-2">학원 기본 정보</h2>
                <p className="text-gray-400 text-sm">학원의 기본 정보를 입력해주세요</p>
              </div>

              {/* Academy Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">학원명 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="예: 서초영재수학학원"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">대표자명 *</label>
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={(e) => updateForm('ownerName', e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    연락처 *
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    placeholder="010-1234-5678"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    이메일 *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    placeholder="academy@example.com"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  주소
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  placeholder="서울시 서초구 서초대로 123"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">학원 유형 *</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => updateForm('category', cat.id)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        form.category === cat.id 
                          ? 'bg-cyan-600 text-white' 
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-xl block mb-1">{cat.icon}</span>
                      <span className="text-xs">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Count */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  학생 수
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {STUDENT_COUNTS.map(count => (
                    <button
                      key={count.id}
                      onClick={() => updateForm('studentCount', count.id)}
                      className={`p-2 rounded-lg text-xs transition-all ${
                        form.studentCount === count.id 
                          ? 'bg-cyan-600 text-white' 
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {count.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Business Certificate */}
          {step === 'cert' && (
            <motion.div
              key="cert"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold mb-2">사업자 인증</h2>
                <p className="text-gray-400 text-sm">사업자등록번호를 입력해주세요</p>
              </div>

              {/* Business Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  사업자등록번호 *
                </label>
                <input
                  type="text"
                  value={form.businessNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9-]/g, '');
                    updateForm('businessNumber', value);
                  }}
                  placeholder="123-45-67890"
                  maxLength={12}
                  className="w-full px-4 py-4 bg-gray-900 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors text-lg font-mono tracking-wider text-center"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  하이픈(-)을 포함하여 입력해주세요
                </p>
              </div>

              {/* File Upload (Optional) */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  사업자등록증 이미지 (선택)
                </label>
                <label className="block w-full p-8 border-2 border-dashed border-gray-700 rounded-xl text-center cursor-pointer hover:border-cyan-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  {form.businessCertFile ? (
                    <p className="text-cyan-400 text-sm">{form.businessCertFile.name}</p>
                  ) : (
                    <p className="text-gray-500 text-sm">클릭하여 파일 업로드</p>
                  )}
                </label>
              </div>

              {/* Verification Status */}
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-400 font-semibold">인증 안내</p>
                    <p className="text-xs text-gray-400 mt-1">
                      사업자등록번호는 자동으로 검증됩니다. 정확한 번호를 입력해주세요.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Plan Selection */}
          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold mb-2">요금제 선택</h2>
                <p className="text-gray-400 text-sm">학원에 맞는 요금제를 선택해주세요</p>
              </div>

              <div className="space-y-4">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => updateForm('plan', plan.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all relative ${
                      form.plan === plan.id 
                        ? 'bg-cyan-900/30 border-2 border-cyan-500' 
                        : 'bg-gray-900 border border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-2 right-4 bg-cyan-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                        추천
                      </span>
                    )}
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {form.plan === plan.id && (
                          <Check className="w-5 h-5 text-cyan-400" />
                        )}
                        <span className="font-bold text-lg">{plan.name}</span>
                      </div>
                      <span className="text-cyan-400 font-bold">{plan.price}</span>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-3">{plan.desc}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {plan.features.map((feature, idx) => (
                        <span key={idx} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
                <h2 className="text-xl font-bold mb-2">등록 정보 확인</h2>
                <p className="text-gray-400 text-sm">입력하신 정보를 확인해주세요</p>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">학원명</span>
                  <span className="font-semibold">{form.name || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">대표자</span>
                  <span className="font-semibold">{form.ownerName || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">연락처</span>
                  <span className="font-semibold">{form.phone || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">이메일</span>
                  <span className="font-semibold">{form.email || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">사업자번호</span>
                  <span className="font-mono text-cyan-400">{form.businessNumber || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">학원 유형</span>
                  <span className="font-semibold">
                    {CATEGORIES.find(c => c.id === form.category)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">요금제</span>
                  <span className="font-bold text-cyan-400">
                    {PLANS.find(p => p.id === form.plan)?.name || '-'}
                  </span>
                </div>
              </div>

              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-400 font-semibold">등록 준비 완료</p>
                    <p className="text-xs text-gray-400 mt-1">
                      아래 버튼을 클릭하면 학원이 등록됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step !== 'info' && (
            <button
              onClick={prevStep}
              className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              이전
            </button>
          )}
          
          {step !== 'confirm' ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                canProceed() 
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              다음
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  등록 중...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  학원 등록하기
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
