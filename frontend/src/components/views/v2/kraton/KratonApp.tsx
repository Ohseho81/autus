/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🦎 KRATON APP - Main Application Container
 * 12 Cycles Integrated - All Views Unified
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import { 
  Target, CloudRain, Activity, Microscope, Calendar, 
  Zap, Map, Settings, Brain 
} from 'lucide-react';
import { COLORS } from '../design-system';
import { NavButton } from './NavButton';
import {
  KratonCockpit,
  KratonForecast,
  KratonPulse,
  KratonMicroscope,
  KratonTimeline,
  KratonActions,
  KratonMap,
} from './views';

interface ViewParams {
  [key: string]: any;
}

export const KratonApp: React.FC = () => {
  const [currentView, setCurrentView] = useState('cockpit');
  const [viewParams, setViewParams] = useState<ViewParams>({});
  
  const navigate = useCallback((view: string, params: ViewParams = {}) => {
    setCurrentView(view);
    setViewParams(params);
  }, []);
  
  const renderView = () => {
    const props = { onNavigate: navigate, params: viewParams };
    
    switch (currentView) {
      case 'cockpit':
        return <KratonCockpit {...props} />;
      case 'forecast':
        return <KratonForecast {...props} />;
      case 'pulse':
        return <KratonPulse {...props} />;
      case 'microscope':
        return <KratonMicroscope {...props} />;
      case 'timeline':
        return <KratonTimeline {...props} />;
      case 'actions':
        return <KratonActions {...props} />;
      case 'map':
        return <KratonMap {...props} />;
      default:
        return <KratonCockpit {...props} />;
    }
  };
  
  const navItems = [
    { id: 'cockpit', icon: Target, label: '조종석' },
    { id: 'forecast', icon: CloudRain, label: '예보' },
    { id: 'pulse', icon: Activity, label: '맥박' },
    { id: 'microscope', icon: Microscope, label: '현미경' },
    { id: 'timeline', icon: Calendar, label: '타임라인' },
    { id: 'actions', icon: Zap, label: '액션' },
    { id: 'map', icon: Map, label: '지도' },
    { id: 'settings', icon: Settings, label: '설정' },
  ];
  
  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        background: `linear-gradient(135deg, ${COLORS.background} 0%, #0F172A 50%, ${COLORS.background} 100%)`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-24">
        {renderView()}
      </div>
      
      {/* Bottom Navigation */}
      <div 
        className="fixed bottom-0 left-0 right-0 border-t"
        style={{ 
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: COLORS.border,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            {navItems.map((item) => (
              <NavButton
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={currentView === item.id}
                onClick={() => navigate(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* AI Assistant Button */}
      <button
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${COLORS.safe.primary} 0%, #0099CC 100%)`,
          boxShadow: `0 0 30px ${COLORS.safe.glow}`,
        }}
        onClick={() => {/* Open MoltBot */}}
      >
        <Brain size={24} color="#fff" />
      </button>
      
      {/* Global Styles */}
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default KratonApp;
