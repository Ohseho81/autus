/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Core Flow Demo
 * σ 계산 → 위험 감지 → 알림 플로우 검증용 컴포넌트
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  SIGMA_BEHAVIORS,
  RISK_THRESHOLDS,
  getSigmaBehaviors,
  getRiskLevel,
} from '../../core/modules/module-config';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

interface StudentDemo {
  id: string;
  name: string;
  behaviors: Record<string, number>; // behavior_id → 점수 (0~1)
}

interface CoreFlowDemoProps {
  mode?: 'basic' | 'advanced';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 데모 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const DEMO_STUDENTS: StudentDemo[] = [
  {
    id: 'student-001',
    name: '김민준',
    behaviors: {
      attendance: 0.95,
      payment: 1.0,
      communication: 0.8,
      renewal: 0.9,
      referral: 0.5,
    },
  },
  {
    id: 'student-002',
    name: '이서연',
    behaviors: {
      attendance: 0.6,
      payment: 0.7,
      communication: 0.5,
      renewal: 0.3,
      referral: 0.0,
    },
  },
  {
    id: 'student-003',
    name: '박지호',
    behaviors: {
      attendance: 0.85,
      payment: 1.0,
      communication: 0.9,
      renewal: 0.8,
      referral: 0.3,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// σ 계산 함수
// ═══════════════════════════════════════════════════════════════════════════════

function calculateSigma(
  behaviors: Record<string, number>,
  mode: 'basic' | 'advanced'
): number {
  const activeBehaviors = getSigmaBehaviors(mode === 'advanced');
  
  let totalWeight = 0;
  let weightedSum = 0;

  for (const behavior of activeBehaviors) {
    const score = behaviors[behavior.id] ?? 0;
    weightedSum += behavior.weight * score;
    totalWeight += Math.abs(behavior.weight);
  }

  // 정규화 (0~2 범위로)
  const sigma = (weightedSum / totalWeight) * 2;
  return Math.max(0, Math.min(2, sigma));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function CoreFlowDemo({ mode = 'basic' }: CoreFlowDemoProps) {
  const [students, setStudents] = useState<StudentDemo[]>(DEMO_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<StudentDemo | null>(null);
  const [alertQueue, setAlertQueue] = useState<Array<{
    studentId: string;
    studentName: string;
    sigma: number;
    level: string;
    message: string;
    timestamp: Date;
  }>>([]);

  // 선택된 학생의 σ 계산
  const selectedSigma = selectedStudent
    ? calculateSigma(selectedStudent.behaviors, mode)
    : null;
  const selectedRisk = selectedSigma !== null ? getRiskLevel(selectedSigma) : null;

  // 행위 점수 변경 핸들러
  const handleBehaviorChange = (behaviorId: string, value: number) => {
    if (!selectedStudent) return;

    setStudents(prev =>
      prev.map(s =>
        s.id === selectedStudent.id
          ? { ...s, behaviors: { ...s.behaviors, [behaviorId]: value } }
          : s
      )
    );
    setSelectedStudent(prev =>
      prev ? { ...prev, behaviors: { ...prev.behaviors, [behaviorId]: value } } : null
    );
  };

  // 위험 감지 시 알림 생성
  useEffect(() => {
    if (!selectedStudent || selectedSigma === null || !selectedRisk) return;

    // Critical 또는 High 위험일 때만 알림
    if (selectedRisk.level === 'CRITICAL' || selectedRisk.level === 'HIGH') {
      const existingAlert = alertQueue.find(
        a => a.studentId === selectedStudent.id && 
             Date.now() - a.timestamp.getTime() < 5000
      );
      
      if (!existingAlert) {
        setAlertQueue(prev => [
          {
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            sigma: selectedSigma,
            level: selectedRisk.level,
            message: `⚠️ ${selectedStudent.name} 학생의 이탈 위험 감지 (σ=${selectedSigma.toFixed(2)})`,
            timestamp: new Date(),
          },
          ...prev.slice(0, 4),
        ]);
      }
    }
  }, [selectedSigma, selectedRisk, selectedStudent]);

  const behaviors = getSigmaBehaviors(mode === 'advanced');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">🧪 Core Flow Demo</h1>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
              MVP 테스트
            </span>
          </div>
          <p className="text-slate-400">
            σ 계산 → 위험 감지 → 알림 플로우를 실시간으로 확인합니다.
          </p>
        </div>

        {/* 3단계 플로우 다이어그램 */}
        <div className="mb-8 p-4 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <span>1️⃣</span>
              <span>σ 계산</span>
            </div>
            <span className="text-slate-500">→</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <span>2️⃣</span>
              <span>위험 감지</span>
            </div>
            <span className="text-slate-500">→</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
              <span>3️⃣</span>
              <span>알림 발송</span>
            </div>
          </div>
          <div className="text-center mt-3 text-xs text-slate-500">
            A = T^σ · 행위 데이터를 조정하면 실시간으로 σ가 계산되고 위험이 감지됩니다.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1단계: 학생 목록 & σ 계산 */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm">1</span>
              σ 계산
            </h2>

            <div className="space-y-2 mb-4">
              {students.map(student => {
                const sigma = calculateSigma(student.behaviors, mode);
                const risk = getRiskLevel(sigma);
                
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`
                      w-full p-3 rounded-lg text-left transition-all
                      ${selectedStudent?.id === student.id
                        ? 'bg-slate-700 border-2 border-blue-500'
                        : 'bg-slate-700/50 border border-slate-600 hover:bg-slate-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{student.name}</span>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: risk.color }}
                        />
                        <span className="font-mono text-sm">
                          σ={sigma.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 행위 조정 슬라이더 */}
            {selectedStudent && (
              <div className="pt-4 border-t border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  {selectedStudent.name}의 행위 점수
                </h3>
                <div className="space-y-3">
                  {behaviors.map(behavior => (
                    <div key={behavior.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={behavior.isCore ? 'text-blue-400' : 'text-slate-400'}>
                          {behavior.nameKo}
                          {behavior.isCore && ' ★'}
                        </span>
                        <span className="font-mono">
                          {((selectedStudent.behaviors[behavior.id] || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={selectedStudent.behaviors[behavior.id] || 0}
                        onChange={(e) => handleBehaviorChange(behavior.id, parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2단계: 위험 감지 */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-sm">2</span>
              위험 감지
            </h2>

            {selectedStudent && selectedSigma !== null && selectedRisk && (
              <>
                {/* σ 게이지 */}
                <div className="mb-6">
                  <div className="text-center mb-2">
                    <span className="text-4xl font-bold font-mono" style={{ color: selectedRisk.color }}>
                      σ = {selectedSigma.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* 게이지 바 */}
                  <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 transition-all duration-300"
                      style={{ 
                        width: `${(selectedSigma / 2) * 100}%`,
                        backgroundColor: selectedRisk.color,
                      }}
                    />
                    {/* 임계값 마커 */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: '30%' }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: '40%' }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: '55%' }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0</span>
                    <span>0.6</span>
                    <span>0.8</span>
                    <span>1.1</span>
                    <span>2</span>
                  </div>
                </div>

                {/* 위험 레벨 */}
                <div 
                  className="p-4 rounded-lg border-2 mb-4"
                  style={{ 
                    backgroundColor: `${selectedRisk.color}20`,
                    borderColor: selectedRisk.color,
                  }}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {selectedRisk.level === 'CRITICAL' && '🔴'}
                      {selectedRisk.level === 'HIGH' && '🟠'}
                      {selectedRisk.level === 'MEDIUM' && '🟡'}
                      {selectedRisk.level === 'LOW' && '🟢'}
                    </div>
                    <div className="font-bold" style={{ color: selectedRisk.color }}>
                      {selectedRisk.level}
                    </div>
                  </div>
                </div>

                {/* 권장 조치 */}
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">권장 조치</div>
                  <div className="text-sm">{selectedRisk.action}</div>
                </div>
              </>
            )}

            {/* 임계값 범례 */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="text-xs text-slate-500 mb-2">임계값 기준</div>
              <div className="space-y-1">
                {RISK_THRESHOLDS.map(t => (
                  <div key={t.level} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="w-16">{t.level}</span>
                    <span className="text-slate-400">
                      σ {t.sigmaMin === 0 ? '<' : '≥'} {t.sigmaMin === 0 ? t.sigmaMax : t.sigmaMin}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3단계: 알림 */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-sm">3</span>
              알림 발송
              {alertQueue.length > 0 && (
                <span className="px-2 py-0.5 bg-red-500 rounded-full text-xs">
                  {alertQueue.length}
                </span>
              )}
            </h2>

            {alertQueue.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">🔔</div>
                <div className="text-sm">위험 감지 시 알림이 표시됩니다</div>
                <div className="text-xs mt-1">σ를 0.8 미만으로 낮춰보세요</div>
              </div>
            ) : (
              <div className="space-y-2">
                {alertQueue.map((alert, i) => (
                  <div 
                    key={i}
                    className={`
                      p-3 rounded-lg border-l-4 animate-pulse
                      ${alert.level === 'CRITICAL' 
                        ? 'bg-red-500/20 border-red-500' 
                        : 'bg-orange-500/20 border-orange-500'
                      }
                    `}
                  >
                    <div className="font-medium text-sm">{alert.message}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">
                        📱 카카오톡
                      </button>
                      <button className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">
                        📧 이메일
                      </button>
                      <button className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">
                        📞 전화
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 알림 채널 설정 */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="text-xs text-slate-500 mb-2">알림 채널</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                  ✓ 카카오 알림톡
                </span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                  ✓ SMS
                </span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                  ✓ 이메일
                </span>
                <span className="px-2 py-1 bg-slate-600 text-slate-400 rounded text-xs">
                  n8n 웹훅
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 공식 설명 */}
        <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="text-center">
            <code className="text-lg text-amber-400">A = T^σ</code>
            <div className="text-sm text-slate-400 mt-2">
              자산(A)은 거래(T)의 만족도(σ) 제곱에 비례합니다. σ가 1 미만이면 자산이 감소합니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
