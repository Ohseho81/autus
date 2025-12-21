// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — Station Info Panel
// Shows station details, transfer options, and physics forecasts
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useMetroStore } from '../store/metroStore';
import { CategoryIcon } from './icons';
import { calcPNR } from '../core/physics_kernel';
import { forecastAtStation, recommendTransfer } from '../core/simulator';

export const StationPanel: React.FC = () => {
  const {
    model,
    entities,
    events,
    selectedStationId,
    featureFlags,
    selectStation,
    moveEntityTo,
    triggerAbort,
  } = useMetroStore();
  
  if (!model || !selectedStationId) return null;
  
  const station = model.stations.find(s => s.station_id === selectedStationId);
  if (!station) return null;
  
  const transfer = model.transfers.find(t => t.station_id === selectedStationId);
  const stationEvents = events.filter(e => e.station_id === selectedStationId).slice(-5);
  
  const selectedEntity = entities[0]; // First entity for demo
  
  // AI recommendation
  const recommendation = featureFlags.aiRecommend && selectedEntity && station.is_transfer
    ? recommendTransfer(selectedEntity, model, selectedStationId)
    : null;
  
  // Get line colors
  const getLineColor = (lineId: string) => {
    const colors: Record<string, string> = {
      L1: '#0052A4', L2: '#00A84D', L3: '#EF7C1C', L4: '#00A5DE',
      L5: '#996CAC', L6: '#CD7C2F', L7: '#747F00', L8: '#E6186C',
      L9: '#BDB092', KB: '#F5A200', KK: '#77C4A3', KA: '#0090D2',
      SB: '#D31F5B', SL: '#6CA8D5',
    };
    return colors[lineId] || '#666';
  };
  
  return (
    <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur rounded-lg shadow-lg p-4 max-w-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-800">
            {station.label.split(' · ')[0]}
          </h3>
          <div className="text-sm text-gray-500">
            {station.label.split(' · ')[1] || 'AUTUS Node'}
          </div>
        </div>
        <button
          onClick={() => selectStation(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      {/* Station type badges */}
      <div className="flex gap-2 mb-3">
        {station.is_transfer && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
            환승역
          </span>
        )}
        {station.is_exit && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            출구 / ABORT
          </span>
        )}
        {station.category && (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
            <CategoryIcon category={station.category} size={12} />
            {station.category}
          </span>
        )}
      </div>
      
      {/* Lines */}
      {station.transfer_lines && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">연결 노선</div>
          <div className="flex gap-1">
            {station.transfer_lines.map(lineId => (
              <span
                key={lineId}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: getLineColor(lineId) }}
              >
                {lineId.replace('L', '')}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Transfer options (Decision UI) */}
      {transfer && selectedEntity && (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            ⬡ DECISION OPTIONS
          </div>
          <div className="space-y-2">
            {transfer.options.map(lineId => {
              // Forecast for this option
              const line = model.lines.find(l => l.line_id === lineId);
              if (!line) return null;
              
              const cost = transfer.switch_cost;
              const isRecommended = recommendation?.lineId === lineId;
              
              return (
                <button
                  key={lineId}
                  onClick={() => {
                    // Switch to this line (simplified - just show forecast)
                    console.log(`Switch to ${lineId}`, cost);
                  }}
                  className={`w-full p-2 rounded border text-left text-xs transition-colors ${
                    isRecommended
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: getLineColor(lineId) }}
                      />
                      <span className="font-medium">{line.name}</span>
                      {isRecommended && (
                        <span className="text-green-600">✓ AI 추천</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-gray-500 grid grid-cols-4 gap-1">
                    <span>Δt: {cost.dt.toFixed(1)}</span>
                    <span>ΔE: {(cost.dE * 100).toFixed(0)}%</span>
                    <span>ΔS: +{(cost.dS * 100).toFixed(0)}%</span>
                    <span>ΔR: +{(cost.dR * 100).toFixed(0)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Exit/Abort action */}
      {station.is_exit && selectedEntity && (
        <div className="mb-3 p-2 bg-red-50 rounded border border-red-200">
          <div className="text-xs font-semibold text-red-600 mb-2">
            ⊘ ABORT STATION
          </div>
          <p className="text-xs text-gray-600 mb-2">
            이 역에서 하차하면 미션이 종료됩니다. 복구 경로가 제안됩니다.
          </p>
          <button
            onClick={() => triggerAbort(selectedEntity.entity_id)}
            className="w-full py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600"
          >
            ABORT MISSION
          </button>
        </div>
      )}
      
      {/* Entity state at this station */}
      {selectedEntity && (
        <div className="mb-3 p-2 bg-blue-50 rounded">
          <div className="text-xs font-semibold text-blue-600 mb-2">
            현재 엔티티 상태
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-500">t</div>
              <div className="font-mono">{selectedEntity.t.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">E</div>
              <div className="font-mono text-green-600">
                {(selectedEntity.E * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">S</div>
              <div className="font-mono text-yellow-600">
                {(selectedEntity.S * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">R</div>
              <div className="font-mono text-red-600">
                {(selectedEntity.R * 100).toFixed(0)}%
              </div>
            </div>
          </div>
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500">PNR: </span>
            <span className={`text-xs font-bold ${
              calcPNR(selectedEntity.E, selectedEntity.S, selectedEntity.R, selectedEntity.t) > 0.7
                ? 'text-red-600'
                : 'text-gray-600'
            }`}>
              {(calcPNR(selectedEntity.E, selectedEntity.S, selectedEntity.R, selectedEntity.t) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
      
      {/* Recent events */}
      {stationEvents.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-1">
            최근 이벤트
          </div>
          <div className="space-y-1">
            {stationEvents.map(event => (
              <div
                key={event.event_id}
                className="flex items-center gap-2 text-xs"
              >
                <CategoryIcon category={event.category} size={14} />
                <span className="text-gray-600">{event.category}</span>
                <span className="text-gray-400">
                  ΔR: {(event.delta.dR * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Coordinates (dev) */}
      <div className="mt-3 pt-2 border-t text-xs text-gray-400">
        ID: {station.station_id} | ({station.x}, {station.y})
      </div>
    </div>
  );
};

export default StationPanel;
