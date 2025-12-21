// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — Control Panel
// Visibility levels, time compression, feature toggles
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useMetroStore } from '../store/metroStore';
import { VisibilityLevel, TimeCompression } from '../core/types';
import { calcPNR } from '../core/physics_kernel';

export const ControlPanel: React.FC = () => {
  const {
    entities,
    events,
    visibilityLevel,
    timeCompression,
    featureFlags,
    showDevOverlay,
    devOverlayOpacity,
    activeMission,
    setVisibilityLevel,
    setTimeCompression,
    toggleFeature,
    toggleDevOverlay,
    setDevOverlayOpacity,
    addEntity,
    stepSimulation,
    triggerExternalShock,
    exportToJSON,
  } = useMetroStore();
  
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Visibility levels 0-4
      if (e.key >= '0' && e.key <= '4') {
        setVisibilityLevel(parseInt(e.key) as VisibilityLevel);
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'h':
          toggleFeature('entropyHeatmap');
          break;
        case 'g':
          toggleFeature('ghostLine');
          break;
        case 't':
          setTimeCompression(
            timeCompression === 1 ? 10 : timeCompression === 10 ? 100 : 1
          );
          break;
        case 'o':
          if (featureFlags.devOverlay) {
            toggleDevOverlay();
          }
          break;
        case ' ':
          e.preventDefault();
          stepSimulation();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setVisibilityLevel,
    toggleFeature,
    setTimeCompression,
    timeCompression,
    toggleDevOverlay,
    stepSimulation,
    featureFlags.devOverlay,
  ]);
  
  const selectedEntity = entities[0]; // For demo, show first entity
  const pnr = selectedEntity 
    ? calcPNR(selectedEntity.E, selectedEntity.S, selectedEntity.R, selectedEntity.t)
    : 0;
  
  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
      {/* Visibility Level */}
      <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          VISIBILITY LEVEL [0-4]
        </div>
        <div className="flex gap-1">
          {([0, 1, 2, 3, 4] as VisibilityLevel[]).map(level => (
            <button
              key={level}
              onClick={() => setVisibilityLevel(level)}
              className={`flex-1 py-1 text-sm font-medium rounded ${
                visibilityLevel === level
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {['Base', 'Events', '+Overlays', '+Critical', 'Analysis'][visibilityLevel]}
        </div>
      </div>
      
      {/* Time Compression */}
      <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          TIME [T]
        </div>
        <div className="flex gap-1">
          {([1, 10, 100] as TimeCompression[]).map(tc => (
            <button
              key={tc}
              onClick={() => setTimeCompression(tc)}
              className={`flex-1 py-1 text-sm font-medium rounded ${
                timeCompression === tc
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ×{tc}
            </button>
          ))}
        </div>
      </div>
      
      {/* Feature Toggles */}
      <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          FEATURES
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <FeatureToggle
            label="Heatmap [H]"
            active={featureFlags.entropyHeatmap}
            onClick={() => toggleFeature('entropyHeatmap')}
          />
          <FeatureToggle
            label="Ghost [G]"
            active={featureFlags.ghostLine}
            onClick={() => toggleFeature('ghostLine')}
          />
          <FeatureToggle
            label="Collision"
            active={featureFlags.collision}
            onClick={() => toggleFeature('collision')}
          />
          <FeatureToggle
            label="Reroute"
            active={featureFlags.autoReroute}
            onClick={() => toggleFeature('autoReroute')}
          />
          <FeatureToggle
            label="Multi-Entity"
            active={featureFlags.multiEntity}
            onClick={() => toggleFeature('multiEntity')}
          />
          <FeatureToggle
            label="AI Recommend"
            active={featureFlags.aiRecommend}
            onClick={() => toggleFeature('aiRecommend')}
          />
        </div>
      </div>
      
      {/* Dev Overlay (if enabled) */}
      {featureFlags.devOverlay && (
        <div className="bg-yellow-50/95 backdrop-blur rounded-lg shadow-lg p-3">
          <div className="text-xs font-semibold text-yellow-700 mb-2">
            DEV OVERLAY [O]
          </div>
          <FeatureToggle
            label="Show Reference"
            active={showDevOverlay}
            onClick={toggleDevOverlay}
          />
          {showDevOverlay && (
            <div className="mt-2">
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.1"
                value={devOverlayOpacity}
                onChange={(e) => setDevOverlayOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center">
                Opacity: {(devOverlayOpacity * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          ACTIONS
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => addEntity('S_HONGDAE', 'L2')}
            className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600"
          >
            + Add Entity
          </button>
          <button
            onClick={stepSimulation}
            disabled={!activeMission}
            className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Step [Space]
          </button>
          <button
            onClick={() => triggerExternalShock(0.5)}
            className="px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded hover:bg-orange-600"
          >
            ⚡ External Shock
          </button>
          <button
            onClick={() => {
              const json = exportToJSON();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `metro-export-${Date.now()}.json`;
              a.click();
            }}
            className="px-3 py-1.5 bg-gray-500 text-white text-xs font-medium rounded hover:bg-gray-600"
          >
            Export JSON
          </button>
        </div>
      </div>
      
      {/* Entity Status */}
      {selectedEntity && (
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3">
          <div className="text-xs font-semibold text-gray-500 mb-2">
            ENTITY STATUS
          </div>
          <div className="space-y-1 text-xs">
            <StatusBar label="Energy" value={selectedEntity.E} color="green" />
            <StatusBar label="Entropy" value={selectedEntity.S} color="yellow" />
            <StatusBar label="Risk" value={selectedEntity.R} color="red" />
            <StatusBar label="PNR" value={pnr} color="purple" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            t = {selectedEntity.t.toFixed(1)} | Steps: {selectedEntity.path_history.length}
          </div>
          {selectedEntity.is_critical && (
            <div className="mt-1 text-xs text-red-500 font-bold animate-pulse">
              ⚠️ CRITICAL STATE
            </div>
          )}
        </div>
      )}
      
      {/* Event Log */}
      <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 max-h-48 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          EVENTS ({events.length})
        </div>
        <div className="space-y-1">
          {events.slice(-5).reverse().map(event => (
            <div
              key={event.event_id}
              className="text-xs text-gray-600 flex items-center gap-1"
            >
              <span className={`
                px-1 py-0.5 rounded text-white text-[10px]
                ${event.category === 'Shock' ? 'bg-red-500' : ''}
                ${event.category === 'Decision' ? 'bg-blue-500' : ''}
                ${event.category === 'Progress' ? 'bg-green-500' : ''}
                ${event.category === 'Collision' ? 'bg-orange-500' : ''}
                ${!['Shock', 'Decision', 'Progress', 'Collision'].includes(event.category) ? 'bg-gray-400' : ''}
              `}>
                {event.category}
              </span>
              <span className="truncate">{event.station_id.replace('S_', '')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Feature toggle button
const FeatureToggle: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
      active
        ? 'bg-blue-100 text-blue-700'
        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
    }`}
  >
    {active ? '✓' : '○'} {label}
  </button>
);

// Status bar component
const StatusBar: React.FC<{
  label: string;
  value: number;
  color: 'green' | 'yellow' | 'red' | 'purple';
}> = ({ label, value, color }) => {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-gray-500">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
        <div
          className={`h-full ${colors[color]} transition-all`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="w-10 text-right">{(value * 100).toFixed(0)}%</span>
    </div>
  );
};

export default ControlPanel;
