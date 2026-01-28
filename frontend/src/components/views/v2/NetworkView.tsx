/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌐 네트워크 뷰 (Network View) - AUTUS 2.0 [고급]
 * 관계망 분석
 * "누가 누구와?"
 * Owner만 접근 가능
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Crown, AlertTriangle, Users } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface NetworkNode {
  id: string;
  name: string;
  temperature: number;
  connections: number;
  isInfluencer?: boolean;
  x: number;
  y: number;
}

interface Cluster {
  id: string;
  name: string;
  memberCount: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  keyMembers: string[];
}

interface NetworkData {
  nodes: NetworkNode[];
  clusters: Cluster[];
  influencers: NetworkNode[];
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_DATA: NetworkData = {
  nodes: [
    { id: 'n1', name: '김민수', temperature: 38, connections: 2, x: 120, y: 180 },
    { id: 'n2', name: '이서연', temperature: 85, connections: 8, isInfluencer: true, x: 200, y: 100 },
    { id: 'n3', name: '박지훈', temperature: 72, connections: 4, x: 280, y: 150 },
    { id: 'n4', name: '최유진', temperature: 65, connections: 3, x: 160, y: 250 },
    { id: 'n5', name: '정하윤', temperature: 78, connections: 5, x: 250, y: 220 },
  ],
  clusters: [
    { id: 'cl1', name: 'A반 그룹', memberCount: 12, healthStatus: 'healthy', keyMembers: ['이서연', '박지훈'] },
    { id: 'cl2', name: 'B반 그룹', memberCount: 8, healthStatus: 'warning', keyMembers: ['최유진', '정하윤'] },
    { id: 'cl3', name: '위험 클러스터', memberCount: 3, healthStatus: 'critical', keyMembers: ['김민수'] },
  ],
  influencers: [
    { id: 'n2', name: '이서연', temperature: 85, connections: 8, isInfluencer: true, x: 200, y: 100 },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const NetworkGraph: React.FC<{ data: NetworkData; onNodeClick: (id: string) => void }> = ({ data, onNodeClick }) => {
  const getNodeColor = (temp: number) => {
    if (temp >= 70) return '#10b981';
    if (temp >= 50) return '#f59e0b';
    return '#ef4444';
  };

  // Simple connections based on proximity
  const connections = [
    [0, 1], [1, 2], [2, 4], [3, 4], [0, 3], [1, 4]
  ];

  return (
    <div className="relative w-full h-72 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 400 300">
        {/* Center node (Academy) */}
        <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <circle cx="200" cy="150" r="20" fill="#3b82f6" opacity="0.3" />
          <polygon
            points="200,135 212,160 188,160"
            fill="#3b82f6"
            stroke="#60a5fa"
            strokeWidth="2"
          />
        </motion.g>
        
        {/* Connections */}
        {connections.map(([from, to], i) => (
          <motion.line
            key={i}
            x1={data.nodes[from].x}
            y1={data.nodes[from].y}
            x2={data.nodes[to].x}
            y2={data.nodes[to].y}
            stroke="#475569"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          />
        ))}
        
        {/* Nodes */}
        {data.nodes.map((node, i) => (
          <motion.g
            key={node.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            onClick={() => onNodeClick(node.id)}
            className="cursor-pointer"
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={node.isInfluencer ? 15 : 10}
              fill={getNodeColor(node.temperature)}
              stroke={node.isInfluencer ? '#fbbf24' : '#0f172a'}
              strokeWidth={node.isInfluencer ? 3 : 2}
            />
            {node.isInfluencer && (
              <text x={node.x} y={node.y - 20} textAnchor="middle" fill="#fbbf24" fontSize="10">👑</text>
            )}
            <text x={node.x} y={node.y + 25} textAnchor="middle" fill="#e2e8f0" fontSize="9">{node.name}</text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface NetworkViewProps {
  onNavigate?: (view: string, params?: any) => void;
}

export function NetworkView({ onNavigate = () => {} }: NetworkViewProps) {
  const [data] = useState<NetworkData>(MOCK_DATA);

  const handleNodeClick = (nodeId: string) => {
    const node = data.nodes.find(n => n.id === nodeId);
    if (node) {
      onNavigate('microscope', { customerId: nodeId });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Globe size={20} />
          </div>
          <div>
            <div className="text-lg font-bold flex items-center gap-2">
              네트워크
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">고급</span>
            </div>
            <div className="text-[10px] text-slate-500">관계망 분석</div>
          </div>
        </div>
      </div>

      {/* Network Graph */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <NetworkGraph data={data} onNodeClick={handleNodeClick} />
      </motion.div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Influencers */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <Crown className="text-amber-400" size={14} />
            <span className="text-xs font-medium">영향력자</span>
          </div>
          <div className="space-y-2">
            {data.influencers.map((inf) => (
              <motion.div
                key={inf.id}
                whileHover={{ x: 4 }}
                onClick={() => handleNodeClick(inf.id)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-amber-500/10 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm">{inf.name}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {inf.connections} 연결
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Clusters */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="text-blue-400" size={14} />
            <span className="text-xs font-medium">클러스터</span>
          </div>
          <div className="space-y-2">
            {data.clusters.map((cluster) => (
              <div
                key={cluster.id}
                className={`p-2 rounded-lg ${
                  cluster.healthStatus === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                  cluster.healthStatus === 'warning' ? 'bg-amber-500/10 border border-amber-500/30' :
                  'bg-emerald-500/10 border border-emerald-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{cluster.name}</span>
                  <span className="text-xs text-slate-400">{cluster.memberCount}명</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  핵심: {cluster.keyMembers.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default NetworkView;
