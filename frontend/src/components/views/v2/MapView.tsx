/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🗺️ 지도 뷰 (Map View) - AUTUS 2.0
 * 공간 분석
 * "어디에 분포했나?"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Map, ChevronDown, Building, Star, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface MapCustomer {
  id: string;
  name: string;
  temperature: number;
  distance: number;
  x: number;
  y: number;
}

interface MapCompetitor {
  id: string;
  name: string;
  distance: number;
  threatLevel: 'high' | 'medium' | 'low';
  x: number;
  y: number;
}

interface MapData {
  academy: { name: string; x: number; y: number };
  customers: MapCustomer[];
  competitors: MapCompetitor[];
  radius: number;
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_DATA: MapData = {
  academy: { name: 'KRATON', x: 200, y: 200 },
  customers: [
    { id: 'c1', name: '김민수', temperature: 38, distance: 500, x: 140, y: 280 },
    { id: 'c2', name: '박지훈', temperature: 45, distance: 700, x: 280, y: 260 },
    { id: 'c3', name: '이서연', temperature: 72, distance: 300, x: 160, y: 140 },
    { id: 'c4', name: '최유진', temperature: 85, distance: 600, x: 280, y: 150 },
  ],
  competitors: [
    { id: 'comp1', name: 'D학원', distance: 800, threatLevel: 'high', x: 320, y: 100 },
    { id: 'comp2', name: 'E학원', distance: 1200, threatLevel: 'medium', x: 100, y: 320 },
  ],
  radius: 1.5,
};

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const MapCanvas: React.FC<{
  data: MapData;
  onCustomerClick: (id: string) => void;
  onCompetitorClick: (id: string) => void;
}> = ({ data, onCustomerClick, onCompetitorClick }) => {
  const getCustomerColor = (temp: number) => {
    if (temp >= 70) return '#10b981';
    if (temp >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="relative w-full h-80 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 400 400">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#grid)" />
        
        {/* Radius circles */}
        {[0.5, 1, 1.5].map((r, i) => (
          <circle
            key={r}
            cx={data.academy.x}
            cy={data.academy.y}
            r={60 * (i + 1)}
            fill="none"
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="4"
          />
        ))}
        
        {/* Academy */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <polygon
            points={`${data.academy.x},${data.academy.y - 15} ${data.academy.x + 13},${data.academy.y + 8} ${data.academy.x - 13},${data.academy.y + 8}`}
            fill="#3b82f6"
            stroke="#60a5fa"
            strokeWidth="2"
          />
        </motion.g>
        
        {/* Competitors */}
        {data.competitors.map((comp, i) => (
          <motion.g
            key={comp.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            onClick={() => onCompetitorClick(comp.id)}
            className="cursor-pointer"
          >
            <polygon
              points={`${comp.x},${comp.y - 12} ${comp.x + 10},${comp.y + 6} ${comp.x - 10},${comp.y + 6}`}
              fill={comp.threatLevel === 'high' ? '#ef4444' : comp.threatLevel === 'medium' ? '#f59e0b' : '#64748b'}
              stroke={comp.threatLevel === 'high' ? '#fca5a5' : comp.threatLevel === 'medium' ? '#fcd34d' : '#94a3b8'}
              strokeWidth="2"
            />
            <text x={comp.x} y={comp.y + 25} textAnchor="middle" fill="#94a3b8" fontSize="9">{comp.name}</text>
          </motion.g>
        ))}
        
        {/* Customers */}
        {data.customers.map((customer, i) => (
          <motion.g
            key={customer.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            onClick={() => onCustomerClick(customer.id)}
            className="cursor-pointer"
          >
            <circle
              cx={customer.x}
              cy={customer.y}
              r="10"
              fill={getCustomerColor(customer.temperature)}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <text x={customer.x} y={customer.y + 25} textAnchor="middle" fill="#e2e8f0" fontSize="9">{customer.name}</text>
          </motion.g>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex gap-4 text-[9px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-500 clip-star" />★ 학원
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />🟢 양호
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-500" />🟡 주의
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500" />🔴 위험
        </span>
        <span className="flex items-center gap-1">◇ 경쟁사</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface MapViewProps {
  onNavigate?: (view: string, params?: any) => void;
}

export function MapView({ onNavigate = () => {} }: MapViewProps) {
  const [data] = useState<MapData>(MOCK_DATA);
  const [radius, setRadius] = useState<number>(1.5);

  const handleCustomerClick = (customerId: string) => {
    onNavigate('microscope', { customerId });
  };

  const handleCompetitorClick = (competitorId: string) => {
    console.log('Competitor clicked:', competitorId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Map size={20} />
          </div>
          <div>
            <div className="text-lg font-bold">지도</div>
            <div className="text-[10px] text-slate-500">고객 분포 · 경쟁사</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">반경:</span>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="bg-slate-800/50 rounded-lg px-2 py-1 text-sm border border-slate-700/50"
          >
            <option value={0.5}>500m</option>
            <option value={1}>1km</option>
            <option value={1.5}>1.5km</option>
            <option value={2}>2km</option>
          </select>
        </div>
      </div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <MapCanvas 
          data={data} 
          onCustomerClick={handleCustomerClick}
          onCompetitorClick={handleCompetitorClick}
        />
      </motion.div>

      {/* Lists */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Customers */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
        >
          <div className="text-xs text-slate-400 mb-3">고객 분포 ({data.customers.length}명)</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.customers.map((customer) => (
              <motion.div
                key={customer.id}
                whileHover={{ x: 4 }}
                onClick={() => handleCustomerClick(customer.id)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    customer.temperature >= 70 ? 'bg-emerald-500' : customer.temperature >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">{customer.name}</span>
                  <span className={`text-xs ${
                    customer.temperature >= 70 ? 'text-emerald-400' : customer.temperature >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>{customer.temperature}°</span>
                </div>
                <span className="text-xs text-slate-500">{customer.distance}m</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Competitors */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
        >
          <div className="text-xs text-slate-400 mb-3">경쟁사 ({data.competitors.length}개)</div>
          <div className="space-y-2">
            {data.competitors.map((comp) => (
              <motion.div
                key={comp.id}
                whileHover={{ x: 4 }}
                onClick={() => handleCompetitorClick(comp.id)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Building size={12} className={
                    comp.threatLevel === 'high' ? 'text-red-400' : comp.threatLevel === 'medium' ? 'text-amber-400' : 'text-slate-400'
                  } />
                  <span className="text-sm">{comp.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    comp.threatLevel === 'high' ? 'bg-red-500/20 text-red-400' : comp.threatLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20'
                  }`}>
                    위협{comp.threatLevel === 'high' ? '높음' : comp.threatLevel === 'medium' ? '중간' : '낮음'}
                  </span>
                </div>
                <span className="text-xs text-slate-500">{comp.distance >= 1000 ? `${(comp.distance / 1000).toFixed(1)}km` : `${comp.distance}m`}</span>
              </motion.div>
            ))}
          </div>
          <button className="w-full mt-3 text-center text-[10px] text-blue-400 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20">
            경쟁 분석
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default MapView;
