// ═══════════════════════════════════════════════════════════════════════════════
// 📡 레이더 뷰 (Radar View)
// 위협/기회 감지 - "뭐가 다가오나?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { radarApi } from '@/api/views';

interface Threat {
  id: string;
  name: string;
  category: string;
  severity: string;
  eta: number;
  etaDate: string;
  sigmaImpact: number;
  affectedCustomers: number;
  description: string;
}

interface Opportunity {
  id: string;
  name: string;
  category: string;
  potential: string;
  eta: number;
  sigmaImpact: number;
  potentialCustomers: number;
  description: string;
  suggestedAction?: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', ring: 'ring-red-500' },
  warning: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', ring: 'ring-yellow-500' },
  info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-500' },
  low: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', ring: 'ring-gray-400' },
};

export function RadarView() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'threats' | 'opportunities'>('threats');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [threatsData, oppsData] = await Promise.all([
        radarApi.getThreats(),
        radarApi.getOpportunities(),
      ]);
      // Transform API response to component format
      const rawThreats = Array.isArray(threatsData) ? threatsData : [];
      setThreats(rawThreats.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: 'external',
        severity: t.severity || 'warning',
        eta: t.eta,
        etaDate: new Date(Date.now() + t.eta * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR'),
        sigmaImpact: t.impact || 0,
        affectedCustomers: 5,
        description: t.name,
      })));
      const rawOpps = Array.isArray(oppsData) ? oppsData : [];
      setOpportunities(rawOpps.map((o: any) => ({
        id: o.id,
        name: o.name,
        category: 'market',
        potential: o.potential || 'medium',
        eta: o.eta,
        sigmaImpact: o.impact || 0,
        potentialCustomers: 3,
        description: o.name,
      })));
    } catch (error) {
      console.error('Radar load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>📡</span> 레이더
        </h1>
        
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
            위협 {threats.length}
          </span>
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
            기회 {opportunities.length}
          </span>
        </div>
      </div>

      {/* 레이더 시각화 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-900 rounded-xl p-8 relative min-h-[300px] overflow-hidden"
      >
        {/* 레이더 원 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i}
              className="absolute rounded-full border border-green-500/30"
              style={{ 
                width: `${i * 20}%`, 
                height: `${i * 20}%`,
              }}
            />
          ))}
          {/* 스캔 라인 */}
          <motion.div 
            className="absolute w-1/2 h-0.5 bg-gradient-to-r from-green-500 to-transparent origin-left"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        
        {/* 중앙 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
        </div>
        
        {/* 위협 점 */}
        {threats.slice(0, 5).map((threat, i) => {
          const angle = (i * 72) * (Math.PI / 180);
          const distance = 30 + (threat.eta * 3);
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance;
          
          return (
            <motion.div
              key={threat.id}
              className="absolute"
              style={{ 
                top: `calc(50% + ${y}%)`,
                left: `calc(50% + ${x}%)`,
                transform: 'translate(-50%, -50%)'
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                threat.severity === 'critical' ? 'bg-red-500' :
                threat.severity === 'warning' ? 'bg-yellow-500' : 'bg-orange-400'
              }`} />
            </motion.div>
          );
        })}
        
        {/* 기회 점 */}
        {opportunities.slice(0, 3).map((opp, i) => {
          const angle = ((i * 120) + 45) * (Math.PI / 180);
          const distance = 25 + (opp.eta * 2);
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance;
          
          return (
            <motion.div
              key={opp.id}
              className="absolute"
              style={{ 
                top: `calc(50% + ${y}%)`,
                left: `calc(50% + ${x}%)`,
                transform: 'translate(-50%, -50%)'
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </motion.div>
          );
        })}
      </motion.div>

      {/* 탭 */}
      <div className="flex gap-2 border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab('threats')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'threats'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚠️ 위협 ({threats.length})
        </button>
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'opportunities'
              ? 'text-green-500 border-b-2 border-green-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✨ 기회 ({opportunities.length})
        </button>
      </div>

      {/* 목록 */}
      <div className="space-y-4">
        {activeTab === 'threats' ? (
          threats.map((threat, index) => (
            <ThreatCard key={threat.id} threat={threat} index={index} />
          ))
        ) : (
          opportunities.map((opp, index) => (
            <OpportunityCard key={opp.id} opportunity={opp} index={index} />
          ))
        )}
      </div>
    </div>
  );
}

function ThreatCard({ threat, index }: { threat: Threat; index: number }) {
  const style = SEVERITY_STYLES[threat.severity] || SEVERITY_STYLES.low;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 rounded-xl ${style.bg} ring-1 ${style.ring}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${style.text}`}>
              {threat.severity}
            </span>
            <span className="text-xs text-gray-500">{threat.category}</span>
          </div>
          <h3 className="font-semibold mt-2">{threat.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{threat.description}</p>
        </div>
        <div className="text-right ml-4">
          <div className="text-2xl font-bold text-red-500">D-{threat.eta}</div>
          <div className="text-xs text-gray-500">도착 예정</div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div>
          <div className="text-sm text-gray-500">σ 영향</div>
          <div className="font-bold text-red-500">{threat.sigmaImpact.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">영향 고객</div>
          <div className="font-bold">{threat.affectedCustomers}명</div>
        </div>
      </div>
    </motion.div>
  );
}

function OpportunityCard({ opportunity, index }: { opportunity: Opportunity; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
              opportunity.potential === 'high' ? 'bg-green-500 text-white' :
              opportunity.potential === 'medium' ? 'bg-green-300 text-green-800' :
              'bg-gray-200 text-gray-700'
            }`}>
              {opportunity.potential}
            </span>
            <span className="text-xs text-gray-500">{opportunity.category}</span>
          </div>
          <h3 className="font-semibold mt-2">{opportunity.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{opportunity.description}</p>
          {opportunity.suggestedAction && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              💡 {opportunity.suggestedAction}
            </p>
          )}
        </div>
        <div className="text-right ml-4">
          <div className="text-2xl font-bold text-green-500">+{opportunity.potentialCustomers}</div>
          <div className="text-xs text-gray-500">잠재 고객</div>
        </div>
      </div>
    </motion.div>
  );
}

export default RadarView;
