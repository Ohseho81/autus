// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Scale System Demo Page
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion } from 'framer-motion';
import {
  ScaleProvider,
  ScaleSelector,
  ScaleIndicator,
  ScaleContainer,
  ScaleButton,
  useScale,
  SCALE_DEFINITIONS,
  KScale,
} from './ScaleUI';

// K단계별 카드
function ScaleCard({ scale }: { scale: KScale }) {
  const def = SCALE_DEFINITIONS[scale];
  const { currentScale } = useScale();
  const isActive = scale === currentScale;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: def.level * 0.05 }}
      className={`
        p-4 rounded-xl border transition-all duration-300
        ${isActive ? 'ring-2' : ''}
      `}
      style={{
        backgroundColor: `${def.color.primary}10`,
        borderColor: `${def.color.primary}30`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div 
          className="px-3 py-1 rounded-full font-mono font-bold text-sm"
          style={{
            backgroundColor: `${def.color.primary}20`,
            color: def.color.primary,
          }}
        >
          {scale}
        </div>
        <span className="text-xs text-white/40">Level {def.level}</span>
      </div>
      
      <h3 className="font-semibold text-white mb-1">{def.nameKo}</h3>
      <p className="text-xs text-white/60 mb-3">{def.description}</p>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-black/30 rounded-lg">
          <span className="text-white/40">승인</span>
          <div className="font-semibold text-white/80">{def.approvalAuthorityKo}</div>
        </div>
        <div className="p-2 bg-black/30 rounded-lg">
          <span className="text-white/40">비용</span>
          <div className="font-semibold text-white/80">{def.failureCostTimeKo}</div>
        </div>
      </div>
      
      {/* UI 제한 표시 */}
      <div className="mt-3 flex flex-wrap gap-1">
        {def.ui.ritualRequired && (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
            🔐 Ritual
          </span>
        )}
        {def.ui.confirmSteps > 1 && (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
            ✓×{def.ui.confirmSteps}
          </span>
        )}
        {def.ui.blur > 5 && (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
            Blur {def.ui.blur}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// 실행 예시
function ActionExample() {
  const { currentScale } = useScale();
  const def = SCALE_DEFINITIONS[currentScale];
  
  return (
    <ScaleContainer className="p-6 rounded-xl bg-black/40">
      <h3 className="text-lg font-semibold text-white mb-4">
        현재 컨텍스트: <span style={{ color: def.color.primary }}>{currentScale}</span>
      </h3>
      
      <p className="text-sm text-white/60 mb-6">
        {def.coreJudgment} 관련 작업을 수행합니다.
      </p>
      
      <div className="flex flex-wrap gap-3">
        <ScaleButton scale={currentScale} onClick={() => alert(`${currentScale} 실행!`)}>
          기본 실행
        </ScaleButton>
        
        {/* 더 높은 단계 버튼 (잠금 시연) */}
        {def.level < 10 && (
          <ScaleButton 
            scale={`K${def.level + 3}` as KScale} 
            onClick={() => alert('상위 단계 실행')}
          >
            상위 실행
          </ScaleButton>
        )}
      </div>
      
      {/* 허용 컴포넌트 */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <h4 className="text-sm text-white/50 mb-2">허용 컴포넌트</h4>
        <div className="flex flex-wrap gap-1">
          {def.allowedComponents.map((comp, i) => (
            <span 
              key={i}
              className="px-2 py-1 bg-white/5 rounded text-xs text-white/60"
            >
              {comp}
            </span>
          ))}
        </div>
      </div>
    </ScaleContainer>
  );
}

// 메인 데모
export function ScaleDemo() {
  const scales: KScale[] = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10'];
  
  return (
    <ScaleProvider initialScale="K3" userMaxScale="K7">
      <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
        {/* 헤더 */}
        <header className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30"
            >
              🏛️
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold">
                AUTUS <span className="text-amber-400">Scale v2.0</span>
              </h1>
              <p className="text-sm text-white/50">
                Decision Safety Interface - K1~K10 Demo
              </p>
            </div>
          </div>
          
          {/* 현재 상태 */}
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
            <ScaleIndicator size="lg" />
            <div className="flex-1">
              <ScaleSelector />
            </div>
          </div>
        </header>
        
        {/* 그리드 */}
        <main className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* K1~K10 카드 */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {scales.map((scale) => (
                <ScaleCard key={scale} scale={scale} />
              ))}
            </div>
            
            {/* 실행 예시 */}
            <div className="lg:col-span-1">
              <ActionExample />
            </div>
          </div>
          
          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/10">
                  <th className="p-3">단계</th>
                  <th className="p-3">명칭</th>
                  <th className="p-3">판단 대상</th>
                  <th className="p-3">승인 주체</th>
                  <th className="p-3">실패 비용</th>
                  <th className="p-3">Ritual</th>
                  <th className="p-3">확인</th>
                </tr>
              </thead>
              <tbody>
                {scales.map((scale) => {
                  const def = SCALE_DEFINITIONS[scale];
                  return (
                    <tr 
                      key={scale} 
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="p-3">
                        <span 
                          className="px-2 py-1 rounded font-mono font-bold text-xs"
                          style={{
                            backgroundColor: `${def.color.primary}20`,
                            color: def.color.primary,
                          }}
                        >
                          {scale}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{def.nameKo}</td>
                      <td className="p-3 text-white/60">{def.coreJudgment}</td>
                      <td className="p-3 text-white/60">{def.approvalAuthorityKo}</td>
                      <td className="p-3 text-white/60">{def.failureCostTimeKo}</td>
                      <td className="p-3">
                        {def.ui.ritualRequired ? '✅' : '—'}
                      </td>
                      <td className="p-3">{def.ui.confirmSteps}단계</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
        
        {/* 푸터 */}
        <footer className="max-w-6xl mx-auto mt-12 pt-6 border-t border-white/10 text-center text-white/30 text-sm">
          <p>"스케일은 '공간'이 아니라 '책임 반경'이다"</p>
          <p className="mt-1">AUTUS v4.0 - Decision Safety Interface</p>
        </footer>
      </div>
    </ScaleProvider>
  );
}

export default ScaleDemo;
