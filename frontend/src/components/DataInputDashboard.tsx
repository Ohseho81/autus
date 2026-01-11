/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 72³ 데이터 입력 대시보드
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 실제 데이터 수집 → 학습 → 예측 통합 화면
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  LearningLoop72, 
  SAMPLE_ACADEMY_STATES,
  State72,
  NODE_NAMES,
} from '../engine';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

interface AcademyInput {
  // 기본 정보
  period: string;           // 2025-01
  
  // 재무 (n01, n05, n06)
  cash: number;             // 현금
  income: number;           // 월 매출
  expense: number;          // 월 비용
  
  // 고객 (n09)
  customers: number;        // 학생 수
  newCustomers: number;     // 신규 학생
  churnCustomers: number;   // 이탈 학생
  
  // 강사 (n34, n70)
  teachers: number;         // 강사 수
  teacherTurnover: number;  // 이직 강사
  keyTeacherRatio: number;  // 핵심강사 의존도
  
  // 정성 지표 (n33, n69)
  loyaltyScore: number;     // 충성도 (1-10)
  referralRate: number;     // 추천율 (%)
  
  // 마케팅 (n57)
  marketingCost: number;    // 마케팅 비용
  inquiries: number;        // 신규 문의
}

// ═══════════════════════════════════════════════════════════════════════════════
// 변환 함수
// ═══════════════════════════════════════════════════════════════════════════════

function inputToState72(input: AcademyInput): State72 {
  const [year, month] = input.period.split('-').map(Number);
  
  // n17: 수입 흐름 (전월 대비 - 첫 입력은 1.0)
  const incomeFlow = 1.0;
  
  // n21: 신규 유입률
  const newRate = input.customers > 0 
    ? input.newCustomers / input.customers 
    : 0;
  
  // n33: 충성도 (1-10 → 0-1)
  const loyalty = input.loyaltyScore / 10;
  
  // n34: 강사 근속률
  const retention = input.teachers > 0 
    ? 1 - (input.teacherTurnover / input.teachers)
    : 0.8;
  
  // n41: 수입 가속도 (첫 입력은 0)
  const incomeAccel = 0;
  
  // n45: 고객 가속도
  const customerAccel = 0;
  
  // n47: 경쟁 압력 (기본값)
  const competition = 0.15;
  
  // n57: CAC
  const cac = input.inquiries > 0 
    ? input.marketingCost / input.inquiries 
    : 50000;
  
  // n69: 추천율
  const referral = input.referralRate / 100;
  
  // n70: 핵심강사 의존도
  const dependency = input.keyTeacherRatio / 100;
  
  return {
    timestamp: new Date(year, month - 1, 1),
    values: {
      n01: input.cash,
      n05: input.income,
      n06: input.expense,
      n09: input.customers,
      n17: incomeFlow,
      n21: newRate,
      n33: loyalty,
      n34: retention,
      n41: incomeAccel,
      n45: customerAccel,
      n47: competition,
      n57: cac,
      n69: referral,
      n70: dependency,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function DataInputDashboard() {
  // 입력 데이터 히스토리
  const [dataHistory, setDataHistory] = useState<AcademyInput[]>([]);
  
  // 현재 입력 폼
  const [currentInput, setCurrentInput] = useState<AcademyInput>({
    period: new Date().toISOString().slice(0, 7),
    cash: 23000000,
    income: 52000000,
    expense: 41000000,
    customers: 127,
    newCustomers: 8,
    churnCustomers: 5,
    teachers: 8,
    teacherTurnover: 0,
    keyTeacherRatio: 38,
    loyaltyScore: 7.8,
    referralRate: 35,
    marketingCost: 500000,
    inquiries: 15,
  });
  
  // 학습 상태
  const [loop] = useState(() => new LearningLoop72());
  const [isLearning, setIsLearning] = useState(false);
  const [learningResult, setLearningResult] = useState<{
    mse: number;
    improvement: number;
    predictions: Record<string, number>[];
  } | null>(null);
  
  // 데이터 추가
  const addData = useCallback(() => {
    setDataHistory(prev => [...prev, currentInput]);
    
    // 다음 달로 자동 이동
    const [year, month] = currentInput.period.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    setCurrentInput(prev => ({
      ...prev,
      period: `${nextYear}-${String(nextMonth).padStart(2, '0')}`,
    }));
  }, [currentInput]);
  
  // State72 배열로 변환
  const states = useMemo(() => {
    return dataHistory.map(inputToState72);
  }, [dataHistory]);
  
  // 학습 실행
  const runLearning = useCallback(async () => {
    if (states.length < 2) {
      alert('최소 2개월 이상의 데이터가 필요합니다.');
      return;
    }
    
    setIsLearning(true);
    
    try {
      loop.reset();
      const epochResult = loop.epochLearn(states, 10);
      
      // 향후 3개월 예측
      const predictions: Record<string, number>[] = [];
      let lastState = states[states.length - 1];
      
      for (let i = 0; i < 3; i++) {
        const predicted = loop.predict(lastState);
        predictions.push(predicted);
        lastState = { 
          timestamp: new Date(lastState.timestamp.getTime() + 30 * 24 * 60 * 60 * 1000),
          values: predicted,
        };
      }
      
      setLearningResult({
        mse: epochResult.finalMse,
        improvement: epochResult.epochResults[0]?.avgMse 
          ? (epochResult.epochResults[0].avgMse - epochResult.finalMse) / epochResult.epochResults[0].avgMse * 100
          : 0,
        predictions,
      });
    } finally {
      setIsLearning(false);
    }
  }, [loop, states]);
  
  // 샘플 데이터 로드
  const loadSampleData = useCallback(() => {
    const sampleInputs: AcademyInput[] = SAMPLE_ACADEMY_STATES.slice(0, 6).map((state, i) => ({
      period: `2025-${String(i + 1).padStart(2, '0')}`,
      cash: state.values.n01 || 23000000,
      income: state.values.n05 || 52000000,
      expense: state.values.n06 || 41000000,
      customers: state.values.n09 || 127,
      newCustomers: Math.round((state.values.n21 || 0.05) * (state.values.n09 || 127)),
      churnCustomers: Math.round(0.03 * (state.values.n09 || 127)),
      teachers: 8,
      teacherTurnover: 0,
      keyTeacherRatio: (state.values.n70 || 0.38) * 100,
      loyaltyScore: (state.values.n33 || 0.78) * 10,
      referralRate: (state.values.n69 || 0.35) * 100,
      marketingCost: 500000,
      inquiries: 15,
    }));
    
    setDataHistory(sampleInputs);
  }, []);
  
  // 입력 핸들러
  const updateInput = (field: keyof AcademyInput, value: number | string) => {
    setCurrentInput(prev => ({ ...prev, [field]: value }));
  };
  
  const formatMoney = (v: number) => `₩${(v / 10000).toLocaleString()}만`;
  const formatPct = (v: number) => `${v.toFixed(1)}%`;
  
  return (
    <div className="min-h-full h-full bg-slate-900 text-white p-4 overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl p-5 mb-6">
          <h1 className="text-2xl font-bold mb-1">📊 AUTUS 72³ 데이터 입력</h1>
          <p className="text-sm opacity-80">실제 데이터 → 학습 → 예측</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 데이터 입력 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-800 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">월간 데이터 입력</h2>
                <input
                  type="month"
                  value={currentInput.period}
                  onChange={e => updateInput('period', e.target.value)}
                  className="bg-slate-700 px-3 py-1 rounded text-sm"
                />
              </div>
              
              {/* 재무 섹션 */}
              <div className="mb-6">
                <h3 className="text-sm text-cyan-400 mb-3 font-medium">💰 재무</h3>
                <div className="grid grid-cols-3 gap-4">
                  <InputField
                    label="현금"
                    value={currentInput.cash / 10000}
                    onChange={v => updateInput('cash', v * 10000)}
                    unit="만원"
                  />
                  <InputField
                    label="월 매출"
                    value={currentInput.income / 10000}
                    onChange={v => updateInput('income', v * 10000)}
                    unit="만원"
                  />
                  <InputField
                    label="월 비용"
                    value={currentInput.expense / 10000}
                    onChange={v => updateInput('expense', v * 10000)}
                    unit="만원"
                  />
                </div>
              </div>
              
              {/* 고객 섹션 */}
              <div className="mb-6">
                <h3 className="text-sm text-green-400 mb-3 font-medium">👥 고객</h3>
                <div className="grid grid-cols-3 gap-4">
                  <InputField
                    label="현재 학생"
                    value={currentInput.customers}
                    onChange={v => updateInput('customers', v)}
                    unit="명"
                  />
                  <InputField
                    label="신규 학생"
                    value={currentInput.newCustomers}
                    onChange={v => updateInput('newCustomers', v)}
                    unit="명"
                  />
                  <InputField
                    label="이탈 학생"
                    value={currentInput.churnCustomers}
                    onChange={v => updateInput('churnCustomers', v)}
                    unit="명"
                  />
                </div>
              </div>
              
              {/* 강사 섹션 */}
              <div className="mb-6">
                <h3 className="text-sm text-purple-400 mb-3 font-medium">👨‍🏫 강사</h3>
                <div className="grid grid-cols-3 gap-4">
                  <InputField
                    label="강사 수"
                    value={currentInput.teachers}
                    onChange={v => updateInput('teachers', v)}
                    unit="명"
                  />
                  <InputField
                    label="이직 강사"
                    value={currentInput.teacherTurnover}
                    onChange={v => updateInput('teacherTurnover', v)}
                    unit="명"
                  />
                  <InputField
                    label="핵심강사 의존도"
                    value={currentInput.keyTeacherRatio}
                    onChange={v => updateInput('keyTeacherRatio', v)}
                    unit="%"
                  />
                </div>
              </div>
              
              {/* 만족도 섹션 */}
              <div className="mb-6">
                <h3 className="text-sm text-yellow-400 mb-3 font-medium">⭐ 만족도</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="충성도 (1-10)"
                    value={currentInput.loyaltyScore}
                    onChange={v => updateInput('loyaltyScore', Math.min(10, Math.max(1, v)))}
                    unit="점"
                    step={0.1}
                  />
                  <InputField
                    label="추천율"
                    value={currentInput.referralRate}
                    onChange={v => updateInput('referralRate', v)}
                    unit="%"
                  />
                </div>
              </div>
              
              {/* 마케팅 섹션 */}
              <div className="mb-6">
                <h3 className="text-sm text-orange-400 mb-3 font-medium">📢 마케팅</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="마케팅 비용"
                    value={currentInput.marketingCost / 10000}
                    onChange={v => updateInput('marketingCost', v * 10000)}
                    unit="만원"
                  />
                  <InputField
                    label="신규 문의"
                    value={currentInput.inquiries}
                    onChange={v => updateInput('inquiries', v)}
                    unit="건"
                  />
                </div>
              </div>
              
              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={addData}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-2 rounded-lg font-medium transition"
                >
                  ➕ 데이터 추가
                </button>
                <button
                  onClick={loadSampleData}
                  className="px-4 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition"
                >
                  📥 샘플 로드
                </button>
              </div>
            </div>
          </div>
          
          {/* 우측: 데이터 목록 + 학습 */}
          <div className="space-y-4">
            {/* 데이터 목록 */}
            <div className="bg-slate-800 rounded-xl p-5">
              <h2 className="font-bold text-lg mb-3">📋 입력된 데이터</h2>
              
              {dataHistory.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-8">
                  데이터를 입력하거나<br />샘플 데이터를 로드하세요
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {dataHistory.map((d, i) => (
                    <div key={i} className="bg-slate-700 rounded-lg p-3 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-cyan-400">{d.period}</span>
                        <span className="text-slate-400">{d.customers}명</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        매출 {formatMoney(d.income)} / 충성도 {d.loyaltyScore}점
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-500 mb-2">
                  {dataHistory.length}개월 데이터 (최소 2개월 필요)
                </div>
                <button
                  onClick={runLearning}
                  disabled={isLearning || dataHistory.length < 2}
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    isLearning || dataHistory.length < 2
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500'
                  }`}
                >
                  {isLearning ? '⏳ 학습 중...' : '🚀 학습 시작'}
                </button>
              </div>
            </div>
            
            {/* 학습 결과 */}
            {learningResult && (
              <div className="bg-slate-800 rounded-xl p-5">
                <h2 className="font-bold text-lg mb-3">📈 학습 결과</h2>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-700 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400">MSE</div>
                    <div className="text-lg font-bold text-cyan-400">
                      {learningResult.mse.toFixed(6)}
                    </div>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400">개선율</div>
                    <div className="text-lg font-bold text-green-400">
                      {learningResult.improvement.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <h3 className="text-sm font-medium mb-2">🔮 향후 3개월 예측</h3>
                <div className="space-y-2">
                  {learningResult.predictions.map((pred, i) => {
                    const lastData = dataHistory[dataHistory.length - 1];
                    const [year, month] = lastData.period.split('-').map(Number);
                    const futureMonth = ((month + i) % 12) + 1;
                    const futureYear = year + Math.floor((month + i) / 12);
                    
                    return (
                      <div key={i} className="bg-slate-700 rounded-lg p-3 text-sm">
                        <div className="font-medium text-cyan-400 mb-1">
                          {futureYear}-{String(futureMonth).padStart(2, '0')}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">학생: </span>
                            <span>{Math.round(pred.n09 || 0)}명</span>
                          </div>
                          <div>
                            <span className="text-slate-400">충성도: </span>
                            <span>{formatPct((pred.n33 || 0) * 100)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">매출: </span>
                            <span>{formatMoney(pred.n05 || 0)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">의존도: </span>
                            <span>{formatPct((pred.n70 || 0) * 100)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 헬퍼 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

function InputField({
  label,
  value,
  onChange,
  unit,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          step={step}
          className="flex-1 bg-slate-700 px-3 py-2 rounded text-right text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
        />
        <span className="text-xs text-slate-500 w-10">{unit}</span>
      </div>
    </div>
  );
}
