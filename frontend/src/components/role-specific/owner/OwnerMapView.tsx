/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Owner Map View
 * 오너 전용 전략 지도 뷰
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MapLocation {
  id: string;
  name: string;
  type: 'own' | 'competitor' | 'opportunity';
  x: number; // percentage
  y: number; // percentage
  metrics?: {
    students?: number;
    revenue?: number;
    share?: number;
    growth?: number;
  };
  threat?: 'low' | 'medium' | 'high';
}

interface MarketZone {
  id: string;
  name: string;
  marketSize: number; // 만원
  ourShare: number;
  growth: number;
  competition: 'low' | 'medium' | 'high';
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const MAP_LOCATIONS: MapLocation[] = [
  // Our academies
  { id: 'own1', name: '본원', type: 'own', x: 50, y: 50, metrics: { students: 132, revenue: 4200, share: 8.8 } },
  
  // Competitors
  { id: 'comp1', name: 'A학원', type: 'competitor', x: 35, y: 40, metrics: { share: 12.5, growth: -2 }, threat: 'medium' },
  { id: 'comp2', name: 'B학원', type: 'competitor', x: 65, y: 35, metrics: { share: 10.2, growth: 15 }, threat: 'high' },
  { id: 'comp3', name: 'C학원', type: 'competitor', x: 55, y: 70, metrics: { share: 9.1, growth: 3 }, threat: 'medium' },
  { id: 'comp4', name: 'D학원', type: 'competitor', x: 30, y: 65, metrics: { share: 5.5, growth: -5 }, threat: 'low' },
  
  // Opportunities
  { id: 'opp1', name: '신규 아파트', type: 'opportunity', x: 75, y: 55 },
  { id: 'opp2', name: '재개발 지역', type: 'opportunity', x: 25, y: 30 },
];

const MARKET_ZONES: MarketZone[] = [
  { id: 'z1', name: '동부권', marketSize: 15000, ourShare: 12, growth: 8, competition: 'medium' },
  { id: 'z2', name: '서부권', marketSize: 12000, ourShare: 6, growth: 15, competition: 'high' },
  { id: 'z3', name: '남부권', marketSize: 18000, ourShare: 10, growth: 3, competition: 'low' },
  { id: 'z4', name: '북부권', marketSize: 8000, ourShare: 4, growth: -2, competition: 'medium' },
];

const PENDING_DECISIONS = [
  { id: 'd1', title: 'B학원 대응 마케팅', budget: 200, urgency: 'high' },
  { id: 'd2', title: '신규 아파트 전단지', budget: 50, urgency: 'medium' },
  { id: 'd3', title: '온라인 광고 확대', budget: 100, urgency: 'low' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Map Marker Component
// ─────────────────────────────────────────────────────────────────────────────

function MapMarker({ 
  location, 
  isSelected,
  onSelect 
}: { 
  location: MapLocation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const reducedMotion = useReducedMotion();
  
  const markerStyles = {
    own: 'bg-amber-500 border-amber-300',
    competitor: 'bg-red-500 border-red-300',
    opportunity: 'bg-green-500 border-green-300',
  };
  
  const threatRings = {
    low: 'ring-green-500/30',
    medium: 'ring-amber-500/30',
    high: 'ring-red-500/50',
  };

  return (
    <motion.button
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${location.x}%`, top: `${location.y}%` }}
      onClick={onSelect}
      whileHover={reducedMotion ? {} : { scale: 1.2 }}
      whileTap={reducedMotion ? {} : { scale: 0.9 }}
    >
      <div className={`
        relative w-10 h-10 rounded-full border-2 flex items-center justify-center
        ${markerStyles[location.type]}
        ${isSelected ? 'ring-4 ring-white' : ''}
        ${location.threat ? `ring-4 ${threatRings[location.threat]}` : ''}
      `}>
        {location.type === 'own' ? '🏫' : location.type === 'competitor' ? '🎯' : '✨'}
        
        {/* Pulse animation for high threat */}
        {location.threat === 'high' && !reducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </div>
      
      {/* Label */}
      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs bg-slate-900/80 text-white px-2 py-0.5 rounded">
          {location.name}
        </span>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Location Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

function LocationDetailPanel({ 
  location, 
  onClose 
}: { 
  location: MapLocation;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="absolute right-4 top-4 w-72 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden"
      initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reducedMotion ? {} : { opacity: 0, x: 20 }}
    >
      {/* Header */}
      <div className={`
        p-4
        ${location.type === 'own' ? 'bg-amber-500' : 
          location.type === 'competitor' ? 'bg-red-500' : 'bg-green-500'}
      `}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold">{location.name}</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
        </div>
        <div className="text-white/80 text-sm">
          {location.type === 'own' ? '우리 학원' : 
           location.type === 'competitor' ? '경쟁 학원' : '기회 지역'}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {location.metrics && (
          <div className="space-y-3">
            {location.metrics.students && (
              <div className="flex justify-between">
                <span className="text-slate-400">재원생</span>
                <span className="text-white font-medium">{location.metrics.students}명</span>
              </div>
            )}
            {location.metrics.revenue && (
              <div className="flex justify-between">
                <span className="text-slate-400">매출</span>
                <span className="text-white font-medium">{location.metrics.revenue}만원</span>
              </div>
            )}
            {location.metrics.share && (
              <div className="flex justify-between">
                <span className="text-slate-400">시장점유율</span>
                <span className="text-white font-medium">{location.metrics.share}%</span>
              </div>
            )}
            {location.metrics.growth !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">성장률</span>
                <span className={location.metrics.growth > 0 ? 'text-green-400' : 'text-red-400'}>
                  {location.metrics.growth > 0 ? '+' : ''}{location.metrics.growth}%
                </span>
              </div>
            )}
          </div>
        )}
        
        {location.threat && (
          <div className={`
            mt-4 p-3 rounded-lg text-sm
            ${location.threat === 'high' ? 'bg-red-500/20 text-red-300' :
              location.threat === 'medium' ? 'bg-amber-500/20 text-amber-300' :
              'bg-green-500/20 text-green-300'}
          `}>
            위협 수준: {location.threat === 'high' ? '높음' : location.threat === 'medium' ? '중간' : '낮음'}
          </div>
        )}
        
        {location.type === 'opportunity' && (
          <div className="mt-4 space-y-2">
            <button className="w-full py-2 bg-green-500 text-white rounded-lg text-sm font-medium">
              마케팅 계획 수립
            </button>
            <button className="w-full py-2 bg-slate-700 text-white rounded-lg text-sm font-medium">
              시장 분석 보기
            </button>
          </div>
        )}
        
        {location.type === 'competitor' && (
          <div className="mt-4 space-y-2">
            <button className="w-full py-2 bg-red-500 text-white rounded-lg text-sm font-medium">
              대응 전략 수립
            </button>
            <button className="w-full py-2 bg-slate-700 text-white rounded-lg text-sm font-medium">
              상세 분석 보기
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Zone Panel
// ─────────────────────────────────────────────────────────────────────────────

function MarketZonePanel({ zones }: { zones: MarketZone[] }) {
  return (
    <div className="absolute left-4 top-4 w-64 bg-slate-800/95 backdrop-blur-sm rounded-xl p-4">
      <h3 className="text-white font-medium mb-3">📊 권역별 시장</h3>
      
      <div className="space-y-3">
        {zones.map(zone => (
          <div key={zone.id} className="p-2 bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-medium">{zone.name}</span>
              <span className={`text-xs ${
                zone.growth > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {zone.growth > 0 ? '+' : ''}{zone.growth}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>시장규모: {(zone.marketSize / 10000).toFixed(1)}억</span>
              <span>점유율: {zone.ourShare}%</span>
            </div>
            <div className="mt-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${zone.ourShare}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision Queue Panel
// ─────────────────────────────────────────────────────────────────────────────

function DecisionQueuePanel({ decisions }: { decisions: typeof PENDING_DECISIONS }) {
  return (
    <div className="absolute left-4 bottom-4 w-64 bg-slate-800/95 backdrop-blur-sm rounded-xl p-4">
      <h3 className="text-white font-medium mb-3">📋 대기 중 결정</h3>
      
      <div className="space-y-2">
        {decisions.map(decision => (
          <div 
            key={decision.id}
            className={`
              p-3 rounded-lg border-l-4
              ${decision.urgency === 'high' ? 'border-red-500 bg-red-500/10' :
                decision.urgency === 'medium' ? 'border-amber-500 bg-amber-500/10' :
                'border-slate-500 bg-slate-700/50'}
            `}
          >
            <div className="text-white text-sm">{decision.title}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">{decision.budget}만원</span>
              <button className="text-xs text-amber-400 hover:text-amber-300">
                검토하기 →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function OwnerMapView() {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [mapLayer, setMapLayer] = useState<'standard' | 'heatmap' | 'satellite'>('standard');

  return (
    <div className="h-screen bg-slate-900 relative overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
        {/* Grid */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Fake Map Roads */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#475569" strokeWidth="3" />
          <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#475569" strokeWidth="3" />
          <line x1="20%" y1="20%" x2="80%" y2="80%" stroke="#475569" strokeWidth="2" />
          <line x1="80%" y1="20%" x2="20%" y2="80%" stroke="#475569" strokeWidth="2" />
        </svg>
      </div>
      
      {/* Map Markers */}
      {MAP_LOCATIONS.map(location => (
        <MapMarker
          key={location.id}
          location={location}
          isSelected={selectedLocation?.id === location.id}
          onSelect={() => setSelectedLocation(
            selectedLocation?.id === location.id ? null : location
          )}
        />
      ))}
      
      {/* Market Zone Panel */}
      <MarketZonePanel zones={MARKET_ZONES} />
      
      {/* Decision Queue Panel */}
      <DecisionQueuePanel decisions={PENDING_DECISIONS} />
      
      {/* Selected Location Detail */}
      <AnimatePresence>
        {selectedLocation && (
          <LocationDetailPanel
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
          />
        )}
      </AnimatePresence>
      
      {/* Map Controls */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2">
        <button className="w-10 h-10 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
          +
        </button>
        <button className="w-10 h-10 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
          -
        </button>
        <button className="w-10 h-10 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
          📍
        </button>
      </div>
      
      {/* Layer Toggle */}
      <div className="absolute top-4 right-80 flex bg-slate-800/90 rounded-lg overflow-hidden">
        {(['standard', 'heatmap', 'satellite'] as const).map(layer => (
          <button
            key={layer}
            onClick={() => setMapLayer(layer)}
            className={`
              px-3 py-2 text-xs transition-colors
              ${mapLayer === layer ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}
            `}
          >
            {layer === 'standard' ? '기본' : layer === 'heatmap' ? '열지도' : '위성'}
          </button>
        ))}
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 bg-slate-800/90 rounded-lg px-4 py-2">
        <span className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-3 h-3 rounded-full bg-amber-500" /> 우리 학원
        </span>
        <span className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-3 h-3 rounded-full bg-red-500" /> 경쟁 학원
        </span>
        <span className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-3 h-3 rounded-full bg-green-500" /> 기회 지역
        </span>
      </div>
    </div>
  );
}

export default OwnerMapView;
