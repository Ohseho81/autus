/**
 * AUTUS Trinity - ForecastCard Component
 * Displays 1-year forecast scenarios
 */

import React, { memo } from 'react';
import { FORECAST_DATA } from './constants';
import { ForecastCardProps } from './types';

const ForecastCard = memo(function ForecastCard({
  current = FORECAST_DATA.current,
  maintain = FORECAST_DATA.maintain,
  improve = FORECAST_DATA.improve,
  challenge = FORECAST_DATA.challenge,
}: Partial<ForecastCardProps>) {
  const scenarios = [
    { 
      label: '➡️ 유지', 
      value: maintain, 
      color: '#a78bfa', 
      bg: 'rgba(167,139,250,0.1)',
      description: '현재 추세 유지 시'
    },
    { 
      label: '📈 개선', 
      value: improve, 
      color: '#06b6d4', 
      bg: 'rgba(6,182,212,0.1)',
      description: '계획 실행 시'
    },
    { 
      label: '🚀 도전', 
      value: challenge, 
      color: '#4ade80', 
      bg: 'rgba(74,222,128,0.1)',
      description: '모든 목표 달성 시'
    },
  ];

  return (
    <div className="p-4 border-b border-white/5 bg-gradient-to-b from-[rgba(139,92,246,0.05)] to-transparent">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-semibold">📈 1년 후 순자산</span>
        <span className="text-[9px] text-white/40">현재 {current}</span>
      </div>

      {/* Scenario cards */}
      <div className="grid grid-cols-3 gap-2">
        {scenarios.map((scenario) => (
          <div
            key={scenario.label}
            className="text-center p-2.5 rounded-lg transition-all hover:scale-105 cursor-pointer group"
            style={{ background: scenario.bg }}
            title={scenario.description}
          >
            <div className="text-[8px] text-white/50 mb-1">{scenario.label}</div>
            <div className="text-[13px] font-bold" style={{ color: scenario.color }}>
              {scenario.value}
            </div>
            <div className="text-[7px] text-white/30 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {scenario.description}
            </div>
          </div>
        ))}
      </div>

      {/* Growth indicator */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-white/40">성장 잠재력</span>
          <div className="flex items-center gap-1">
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#a78bfa] via-[#06b6d4] to-[#4ade80] rounded-full"
                style={{ width: '75%' }}
              />
            </div>
            <span className="text-[#4ade80] font-medium">+124%</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ForecastCard;
