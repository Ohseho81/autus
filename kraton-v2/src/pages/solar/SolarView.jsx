/**
 * SolarView.jsx
 * 태양계 뷰 - 전체 시스템 시각화
 * 
 * Physics Kernel 변수들을 태양계 형태로 시각화
 * Truth Mode: 변수값 표시
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../components/ui/GlassCard';
import TruthModeToggle from '../../components/ui/TruthModeToggle';

// Physics Kernel 변수들
const PHYSICS_VARS = [
  { id: 'V', name: 'Value', value: 847, orbit: 60, color: '#8b5cf6', size: 24, speed: 0.5 },
  { id: 'T', name: 'Time Cost', value: -68, orbit: 100, color: '#ef4444', size: 18, speed: 0.8 },
  { id: 'M', name: 'Performance', value: 24, orbit: 140, color: '#22c55e', size: 20, speed: 0.6 },
  { id: 's', name: 'Synergy', value: 0.4, orbit: 180, color: '#3b82f6', size: 16, speed: 1.0 },
  { id: 't', name: 'Time', value: 18, orbit: 220, color: '#eab308', size: 14, speed: 0.4 },
  { id: 'E', name: 'Entropy', value: 0.32, orbit: 260, color: '#f97316', size: 12, speed: 1.2 },
];

export default function SolarView() {
  const [truthMode, setTruthMode] = useState(false);
  const [selectedVar, setSelectedVar] = useState(null);
  const [angles, setAngles] = useState({});
  const canvasRef = useRef(null);

  // Initialize angles
  useEffect(() => {
    const initial = {};
    PHYSICS_VARS.forEach((v, i) => {
      initial[v.id] = (i * Math.PI * 2) / PHYSICS_VARS.length;
    });
    setAngles(initial);
  }, []);

  // Animation with requestAnimationFrame (GPU 최적화)
  useEffect(() => {
    let animationId;
    let lastTime = 0;
    const fps = 30; // 30fps로 제한하여 CPU 부하 감소
    const frameInterval = 1000 / fps;

    const animate = (currentTime) => {
      animationId = requestAnimationFrame(animate);
      
      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameInterval) return;
      
      lastTime = currentTime - (deltaTime % frameInterval);
      
      setAngles(prev => {
        const next = { ...prev };
        PHYSICS_VARS.forEach(v => {
          next[v.id] = (prev[v.id] + v.speed * 0.02) % (Math.PI * 2);
        });
        return next;
      });
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Canvas rendering (최적화: 캐싱 + 레이어 분리)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // 불투명 모드로 성능 향상
    const dpr = window.devicePixelRatio || 1;
    const size = 600;
    
    // 캔버스 크기 설정 (최초 1회만)
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);
    }

    const centerX = size / 2;
    const centerY = size / 2;

    // Clear
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, size, size);

    // Draw orbits
    PHYSICS_VARS.forEach(v => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, v.orbit, 0, Math.PI * 2);
      ctx.strokeStyle = `${v.color}20`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw connections to center (V formula visualization)
    PHYSICS_VARS.forEach(v => {
      const angle = angles[v.id] || 0;
      const x = centerX + Math.cos(angle) * v.orbit;
      const y = centerY + Math.sin(angle) * v.orbit;

      const gradient = ctx.createLinearGradient(centerX, centerY, x, y);
      gradient.addColorStop(0, `${v.color}40`);
      gradient.addColorStop(1, `${v.color}10`);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw center (Core)
    const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
    coreGlow.addColorStop(0, '#8b5cf680');
    coreGlow.addColorStop(0.5, '#8b5cf640');
    coreGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#8b5cf6';
    ctx.fill();

    // V text in center
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', centerX, centerY);

    // Draw planets
    PHYSICS_VARS.forEach(v => {
      const angle = angles[v.id] || 0;
      const x = centerX + Math.cos(angle) * v.orbit;
      const y = centerY + Math.sin(angle) * v.orbit;

      // Glow
      const glow = ctx.createRadialGradient(x, y, 0, x, y, v.size * 2);
      glow.addColorStop(0, `${v.color}60`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, v.size * 2, 0, Math.PI * 2);
      ctx.fill();

      // Planet
      ctx.beginPath();
      ctx.arc(x, y, v.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = v.color;
      ctx.fill();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(v.id, x, y + v.size / 2 + 15);

      if (truthMode) {
        ctx.fillStyle = v.color;
        ctx.font = '10px monospace';
        ctx.fillText(
          typeof v.value === 'number' && v.value % 1 !== 0 
            ? v.value.toFixed(2) 
            : v.value.toString(),
          x, y + v.size / 2 + 28
        );
      }
    });

  }, [angles, truthMode]);

  const selectedVarData = PHYSICS_VARS.find(v => v.id === selectedVar);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Solar View
          </h1>
          <p className="text-gray-500 mt-1">Physics Kernel 시각화</p>
        </div>
        <TruthModeToggle enabled={truthMode} onToggle={() => setTruthMode(!truthMode)} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Solar System */}
        <div className="col-span-2">
          <GlassCard className="p-4">
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 'auto', maxWidth: 600 }}
              className="mx-auto rounded-xl cursor-pointer"
              onClick={(e) => {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = 300;
                const centerY = 300;

                // Find clicked planet
                PHYSICS_VARS.forEach(v => {
                  const angle = angles[v.id] || 0;
                  const px = centerX + Math.cos(angle) * v.orbit;
                  const py = centerY + Math.sin(angle) * v.orbit;
                  const dist = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2));
                  if (dist < v.size) {
                    setSelectedVar(v.id);
                  }
                });
              }}
            />

            {/* Formula */}
            <div className="text-center mt-4">
              <p className="text-xl font-mono text-purple-400">
                V = (T × M × s)<sup>t</sup>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                복리 가치 공식
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Selected Variable Info */}
          {selectedVarData ? (
            <GlassCard className="p-5" glowColor="purple">
              <h3 className="text-xl font-bold mb-4">{selectedVarData.name}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">변수</p>
                  <p className="text-2xl font-mono" style={{ color: selectedVarData.color }}>
                    {selectedVarData.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">현재 값</p>
                  {truthMode ? (
                    <p className="text-3xl font-mono" style={{ color: selectedVarData.color }}>
                      {typeof selectedVarData.value === 'number' && selectedVarData.value % 1 !== 0 
                        ? selectedVarData.value.toFixed(2) 
                        : selectedVarData.value}
                      {selectedVarData.id === 'T' || selectedVarData.id === 'M' ? '%' : ''}
                    </p>
                  ) : (
                    <p className="text-lg">
                      {selectedVarData.value > 0 ? '📈 긍정적' : '📉 조정 필요'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">설명</p>
                  <p className="text-sm text-gray-400">
                    {selectedVarData.id === 'V' && '복리 가치 - 전체 시스템의 핵심 지표'}
                    {selectedVarData.id === 'T' && '시간 비용 - 운영에 소요되는 시간 절감률'}
                    {selectedVarData.id === 'M' && '성과 증가 - 재등록률, 신규 등록 등'}
                    {selectedVarData.id === 's' && '시너지 - 구성원 간 협력 효과'}
                    {selectedVarData.id === 't' && '시간 - 복리 효과가 적용되는 기간(개월)'}
                    {selectedVarData.id === 'E' && '엔트로피 - 시스템 혼잡도'}
                  </p>
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-5">
              <p className="text-gray-500 text-center">
                행성을 클릭하여 변수 정보를 확인하세요
              </p>
            </GlassCard>
          )}

          {/* Variables List */}
          <GlassCard className="p-4">
            <h4 className="font-bold mb-3">Physics Kernel</h4>
            <div className="space-y-2">
              {PHYSICS_VARS.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVar(v.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                    selectedVar === v.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: v.color }}
                    />
                    <span className="text-sm">{v.id}</span>
                    <span className="text-xs text-gray-500">{v.name}</span>
                  </div>
                  {truthMode && (
                    <span className="font-mono text-sm" style={{ color: v.color }}>
                      {typeof v.value === 'number' && v.value % 1 !== 0 
                        ? v.value.toFixed(2) 
                        : v.value}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="p-4">
            <h4 className="font-bold mb-3">빠른 조정</h4>
            <div className="space-y-2">
              <button className="w-full py-2 bg-emerald-600/30 hover:bg-emerald-600/50 rounded-lg text-sm transition-all">
                📈 시너지 부스트
              </button>
              <button className="w-full py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-sm transition-all">
                ⏱️ 자동화 확대
              </button>
              <button className="w-full py-2 bg-yellow-600/30 hover:bg-yellow-600/50 rounded-lg text-sm transition-all">
                🎯 리스크 대응
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
