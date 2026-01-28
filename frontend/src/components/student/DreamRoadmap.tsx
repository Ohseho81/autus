/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌟 DreamRoadmap - 꿈 로드맵
 * 
 * "현재 노력 → 미래 꿈" 연결
 * - 학생의 꿈을 시각화
 * - 현재 위치 표시
 * - 각 단계별 타임라인
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

export interface RoadmapStep {
  id: string;
  title: string;
  description?: string;
  timeline: string;      // "지금", "6개월 후", "1년 후" 등
  isCompleted: boolean;
  isCurrent: boolean;
  relatedSkills?: string[];
}

interface DreamRoadmapProps {
  studentName: string;
  dream: string;
  dreamIcon?: string;
  steps: RoadmapStep[];
  motivationMessage?: string;
  currentSkillConnection?: string; // "지금 하는 분수가 코딩의 기초야!"
}

export default function DreamRoadmap({
  studentName,
  dream,
  dreamIcon = '🎯',
  steps,
  motivationMessage,
  currentSkillConnection,
}: DreamRoadmapProps) {
  const currentStep = steps.find(s => s.isCurrent);
  const completedCount = steps.filter(s => s.isCompleted).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>🌟</span>
          <span>나의 꿈 로드맵</span>
        </h3>
        <div className="text-sm text-slate-400">
          {completedCount}/{steps.length} 완료
        </div>
      </div>

      {/* 꿈 표시 */}
      <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{dreamIcon}</span>
          <div>
            <div className="text-xs text-purple-300">{studentName}의 꿈</div>
            <div className="text-lg font-bold text-white">{dream}</div>
          </div>
        </div>
      </div>

      {/* 로드맵 */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="relative">
          {/* 연결선 */}
          <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-slate-700" />
          
          {/* 진행된 연결선 */}
          <div 
            className="absolute left-3 top-4 w-0.5 bg-gradient-to-b from-green-500 to-purple-500 transition-all duration-500"
            style={{ 
              height: `${progress}%`,
              maxHeight: 'calc(100% - 2rem)'
            }}
          />

          {/* 단계들 */}
          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-start gap-4 relative">
                {/* 노드 */}
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center z-10 flex-shrink-0
                  ${step.isCurrent 
                    ? 'bg-purple-500 ring-4 ring-purple-500/30 animate-pulse' 
                    : step.isCompleted 
                      ? 'bg-green-500' 
                      : 'bg-slate-600'
                  }
                `}>
                  {step.isCompleted && <span className="text-xs">✓</span>}
                  {step.isCurrent && <span className="text-xs">▶</span>}
                </div>

                {/* 내용 */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      step.isCurrent ? 'text-purple-300' : 
                      step.isCompleted ? 'text-green-300' : 'text-slate-300'
                    }`}>
                      {step.title}
                    </span>
                    {step.isCurrent && (
                      <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
                        여기!
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{step.timeline}</div>
                  
                  {/* 설명 */}
                  {step.description && (
                    <div className="text-sm text-slate-400 mt-1">{step.description}</div>
                  )}
                  
                  {/* 관련 스킬 */}
                  {step.relatedSkills && step.relatedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {step.relatedSkills.map((skill, i) => (
                        <span 
                          key={i}
                          className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 최종 목표 (꿈) */}
            <div className="flex items-start gap-4 relative">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center z-10 flex-shrink-0">
                <span className="text-xs">🏆</span>
              </div>
              <div>
                <span className="font-bold text-yellow-300">{dream} 달성!</span>
                <div className="text-xs text-slate-500 mt-0.5">최종 목표</div>
              </div>
            </div>
          </div>
        </div>

        {/* 동기부여 메시지 */}
        {motivationMessage && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
            <span className="text-purple-300 text-sm">{motivationMessage}</span>
          </div>
        )}

        {/* 현재 스킬 연결 */}
        {currentSkillConnection && currentStep && (
          <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <div className="text-xs text-cyan-300 flex items-center gap-1">
              <span>💡</span>
              <span>{currentSkillConnection}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
