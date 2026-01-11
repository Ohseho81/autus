/**
 * Self Diagnostic Map
 * AUTUS 자가진단 맵
 */

import React from 'react';

interface Diagnosis {
  node_id: string;
  node_name: string;
  health_status: string;
  urgency_level: number;
  status_report: string;
  primary_issue: string;
  reliability_score: number;
  freshness_score: number;
  consistency_score: number;
  upstream_issues: string[];
  downstream_risks: string[];
  recommended_action: string;
  action_enabled: boolean;
  logs_needed: number;
  value: number;
  domain: string;
  domainColor: string;
}

interface SelfDiagnosticMapProps {
  diagnoses?: Diagnosis[];
  bottlenecks?: any[];
  selfValue?: number;
  onNodeSelect?: (nodeId: string) => void;
}

export function SelfDiagnosticMap({ 
  diagnoses = [], 
  bottlenecks = [], 
  selfValue = 0.5,
  onNodeSelect 
}: SelfDiagnosticMapProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          🔍 Self Diagnostic
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Self Value:</span>
          <span className="text-lg font-bold text-cyan-400">{(selfValue * 100).toFixed(0)}%</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {diagnoses.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            진단 데이터가 없습니다
          </div>
        ) : (
          diagnoses.map((d) => (
            <div 
              key={d.node_id}
              onClick={() => onNodeSelect?.(d.node_id)}
              className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${getStatusColor(d.health_status)}`}
                  />
                  <span className="font-medium text-white">{d.node_name}</span>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${d.domainColor}30`, color: d.domainColor }}
                  >
                    {d.domain}
                  </span>
                </div>
                <span className="text-sm font-mono" style={{ color: d.domainColor }}>
                  {(d.value * 100).toFixed(0)}%
                </span>
              </div>
              
              <p className="text-sm text-slate-400 mb-2">{d.primary_issue}</p>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-slate-500">
                    신뢰도: <span className="text-slate-300">{(d.reliability_score * 100).toFixed(0)}%</span>
                  </span>
                  <span className="text-slate-500">
                    최신성: <span className="text-slate-300">{(d.freshness_score * 100).toFixed(0)}%</span>
                  </span>
                </div>
                {d.action_enabled && (
                  <span className="text-cyan-400">액션 가능 →</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SelfDiagnosticMap;
