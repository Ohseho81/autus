// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — Main Application
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { MetroMap } from './ui/MetroMap';
import { ControlPanel } from './ui/ControlPanel';
import { StationPanel } from './ui/StationPanel';
import './index.css';

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-100">
      {/* Main Metro Map */}
      <MetroMap />
      
      {/* Control Panel (top-right) */}
      <ControlPanel />
      
      {/* Station Info Panel (bottom-left) */}
      <StationPanel />
      
      {/* Help tooltip */}
      <div className="fixed bottom-4 right-4 z-10 text-xs text-gray-400 bg-white/80 px-3 py-2 rounded-lg">
        <div><kbd className="px-1 bg-gray-200 rounded">0-4</kbd> Visibility</div>
        <div><kbd className="px-1 bg-gray-200 rounded">H</kbd> Heatmap</div>
        <div><kbd className="px-1 bg-gray-200 rounded">G</kbd> Ghost</div>
        <div><kbd className="px-1 bg-gray-200 rounded">T</kbd> Time</div>
        <div><kbd className="px-1 bg-gray-200 rounded">O</kbd> Dev Overlay</div>
        <div><kbd className="px-1 bg-gray-200 rounded">Space</kbd> Step</div>
      </div>
    </div>
  );
}

export default App;
