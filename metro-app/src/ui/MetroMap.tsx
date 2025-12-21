// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — Main Metro Map Component
// SVG rendering of metro map with all overlays and interactions
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMetroStore } from '../store/metroStore';
import { Station, Line, EntityState, VisibilityLevel } from '../core/types';
import { calcPNR, calcColorIntensity } from '../core/physics_kernel';
import { StationMarker, LineBadge, CategoryIcon } from './icons';
import metroModelData from '../data/metro_model.json';

const MAP_WIDTH = 1536;
const MAP_HEIGHT = 1536;

// Line colors from model
const LINE_COLORS: Record<string, string> = {
  L1: '#0052A4',
  L2: '#00A84D',
  L3: '#EF7C1C',
  L4: '#00A5DE',
  L5: '#996CAC',
  L6: '#CD7C2F',
  L7: '#747F00',
  L8: '#E6186C',
  L9: '#BDB092',
  KB: '#F5A200',
  KK: '#77C4A3',
  KA: '#0090D2',
  SB: '#D31F5B',
  SL: '#6CA8D5',
};

export const MetroMap: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const {
    model,
    setModel,
    entities,
    events,
    selectedStationId,
    selectedEntityId,
    visibilityLevel,
    featureFlags,
    showDevOverlay,
    devOverlayOpacity,
    reroutePath,
    stableLoop,
    selectStation,
    moveEntityTo,
  } = useMetroStore();
  
  // Load model on mount
  useEffect(() => {
    setModel(metroModelData as any);
  }, [setModel]);
  
  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const dx = (e.clientX - dragStart.x) * (viewBox.w / MAP_WIDTH);
      const dy = (e.clientY - dragStart.y) * (viewBox.h / MAP_HEIGHT);
      setViewBox(vb => ({ ...vb, x: vb.x - dx, y: vb.y - dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, viewBox]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    const newW = Math.min(MAP_WIDTH * 2, Math.max(MAP_WIDTH / 4, viewBox.w * scale));
    const newH = Math.min(MAP_HEIGHT * 2, Math.max(MAP_HEIGHT / 4, viewBox.h * scale));
    
    // Zoom toward mouse position
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      const newX = viewBox.x + (viewBox.w - newW) * mx;
      const newY = viewBox.y + (viewBox.h - newH) * my;
      setViewBox({ x: newX, y: newY, w: newW, h: newH });
    }
  }, [viewBox]);
  
  // Station click handler
  const handleStationClick = useCallback((station: Station) => {
    selectStation(station.station_id);
    
    // If there's a selected entity, try to move it
    if (selectedEntityId) {
      moveEntityTo(selectedEntityId, station.station_id);
    }
  }, [selectStation, selectedEntityId, moveEntityTo]);
  
  if (!model) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        Loading Metro Model...
      </div>
    );
  }
  
  // Get recent events for overlay
  const recentEvents = events.slice(-10);
  
  // Calculate entropy heatmap data
  const entropyMap = new Map<string, number>();
  if (featureFlags.entropyHeatmap) {
    for (const entity of entities) {
      const current = entropyMap.get(entity.current_station_id) || 0;
      entropyMap.set(entity.current_station_id, current + entity.S);
    }
  }
  
  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      {/* Dev reference overlay */}
      {showDevOverlay && featureFlags.devOverlay && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: 'url(/assets/metro/reference.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: devOverlayOpacity,
          }}
        />
      )}
      
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Background */}
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f8f8f8" />
        
        {/* Title */}
        <text x="40" y="60" fontSize="28" fontWeight="bold" fill="#333">
          AUTUS METRO OS
        </text>
        <text x="40" y="90" fontSize="14" fill="#888">
          Decision Physics Interface
        </text>
        
        {/* Han River (simplified) */}
        <path
          d={`M0,700 Q400,680 800,720 Q1200,760 ${MAP_WIDTH},740`}
          fill="none"
          stroke="#cce5ff"
          strokeWidth="40"
          opacity="0.5"
        />
        
        {/* Lines */}
        {model.lines.map(line => (
          <LineRenderer
            key={line.line_id}
            line={line}
            stations={model.stations}
            color={LINE_COLORS[line.line_id] || line.color_hex}
            isHighlighted={stableLoop.isLoop && stableLoop.stations.some(
              s => line.path_station_ids.includes(s)
            )}
          />
        ))}
        
        {/* Reroute path (dashed) */}
        {featureFlags.autoReroute && reroutePath.length > 1 && (
          <ReroutePath
            path={reroutePath}
            stations={model.stations}
          />
        )}
        
        {/* Entropy heatmap */}
        {featureFlags.entropyHeatmap && visibilityLevel >= 3 && (
          <EntropyHeatmap
            entropyMap={entropyMap}
            stations={model.stations}
          />
        )}
        
        {/* Stations */}
        {model.stations.map(station => {
          const lineColor = station.transfer_lines?.[0] 
            ? LINE_COLORS[station.transfer_lines[0]] 
            : '#666';
          
          const hasEntity = entities.some(
            e => e.current_station_id === station.station_id
          );
          
          const recentEvent = recentEvents.find(
            e => e.station_id === station.station_id
          );
          
          const isSelected = selectedStationId === station.station_id;
          const isInLoop = stableLoop.stations.includes(station.station_id);
          
          return (
            <g
              key={station.station_id}
              transform={`translate(${station.x}, ${station.y})`}
              onClick={() => handleStationClick(station)}
              className="cursor-pointer"
            >
              {/* Stable loop highlight */}
              {featureFlags.successLoopHighlight && isInLoop && (
                <circle
                  r="20"
                  fill="none"
                  stroke="#00ff88"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  className="animate-spin"
                  style={{ animationDuration: '10s' }}
                />
              )}
              
              {/* Station marker */}
              <StationMarker
                isTransfer={station.is_transfer}
                isExit={station.is_exit}
                isCurrent={hasEntity}
                lineColor={lineColor}
              />
              
              {/* Selection ring */}
              {isSelected && (
                <circle
                  r="16"
                  fill="none"
                  stroke="#0088ff"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              )}
              
              {/* Event overlay (visibility level dependent) */}
              {recentEvent && visibilityLevel >= 1 && (
                <g transform="translate(10, -10)">
                  <CategoryIcon
                    category={recentEvent.category}
                    size={16}
                    intensity={calcColorIntensity(recentEvent.delta.dR)}
                    pulse={recentEvent.category === 'Shock'}
                  />
                </g>
              )}
              
              {/* Station label */}
              <text
                x="0"
                y="20"
                fontSize="8"
                textAnchor="middle"
                fill="#333"
              >
                {station.label.split(' · ')[0]}
              </text>
              
              {/* AUTUS label (smaller) */}
              {visibilityLevel >= 2 && (
                <text
                  x="0"
                  y="28"
                  fontSize="6"
                  textAnchor="middle"
                  fill="#888"
                >
                  {station.label.split(' · ')[1] || ''}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Entities */}
        {entities.map(entity => (
          <EntityRenderer
            key={entity.entity_id}
            entity={entity}
            stations={model.stations}
            showGhost={featureFlags.ghostLine && visibilityLevel >= 3}
            isSelected={selectedEntityId === entity.entity_id}
          />
        ))}
        
        {/* Line labels */}
        {model.lines.slice(0, 9).map((line, idx) => (
          <g
            key={`label-${line.line_id}`}
            transform={`translate(${40 + idx * 50}, ${MAP_HEIGHT - 40})`}
          >
            <LineBadge
              lineId={line.line_id}
              color={LINE_COLORS[line.line_id] || line.color_hex}
              size={24}
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

// Line renderer component
const LineRenderer: React.FC<{
  line: Line;
  stations: Station[];
  color: string;
  isHighlighted?: boolean;
}> = ({ line, stations, color, isHighlighted }) => {
  const points = line.path_station_ids
    .map(id => stations.find(s => s.station_id === id))
    .filter((s): s is Station => s !== undefined)
    .map(s => `${s.x},${s.y}`)
    .join(' ');
  
  if (!points) return null;
  
  // For circular lines, close the path
  const pathD = line.is_circular
    ? `M ${points} Z`
    : `M ${points}`;
  
  return (
    <g>
      {/* Shadow */}
      <polyline
        points={points}
        fill="none"
        stroke="#00000022"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Main line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isHighlighted ? 'animate-pulse' : ''}
        style={isHighlighted ? { filter: 'drop-shadow(0 0 8px #00ff88)' } : undefined}
      />
    </g>
  );
};

// Reroute path (dashed alternative)
const ReroutePath: React.FC<{
  path: string[];
  stations: Station[];
}> = ({ path, stations }) => {
  const points = path
    .map(id => stations.find(s => s.station_id === id))
    .filter((s): s is Station => s !== undefined)
    .map(s => `${s.x},${s.y}`)
    .join(' ');
  
  return (
    <polyline
      points={points}
      fill="none"
      stroke="#ff8800"
      strokeWidth="3"
      strokeDasharray="8 4"
      strokeLinecap="round"
      className="animate-pulse"
    />
  );
};

// Entropy heatmap overlay
const EntropyHeatmap: React.FC<{
  entropyMap: Map<string, number>;
  stations: Station[];
}> = ({ entropyMap, stations }) => {
  return (
    <g opacity="0.3">
      {Array.from(entropyMap.entries()).map(([stationId, entropy]) => {
        const station = stations.find(s => s.station_id === stationId);
        if (!station) return null;
        
        const radius = 30 + entropy * 50;
        const intensity = Math.min(1, entropy);
        
        return (
          <circle
            key={`heat-${stationId}`}
            cx={station.x}
            cy={station.y}
            r={radius}
            fill={`rgba(255, ${100 - intensity * 100}, 0, ${intensity * 0.5})`}
          />
        );
      })}
    </g>
  );
};

// Entity renderer with ghost trail
const EntityRenderer: React.FC<{
  entity: EntityState;
  stations: Station[];
  showGhost?: boolean;
  isSelected?: boolean;
}> = ({ entity, stations, showGhost, isSelected }) => {
  const currentStation = stations.find(
    s => s.station_id === entity.current_station_id
  );
  
  if (!currentStation) return null;
  
  const pnr = calcPNR(entity.E, entity.S, entity.R, entity.t);
  const isCritical = pnr > 0.7;
  
  // Ghost trail
  const ghostTrail = showGhost
    ? entity.path_history.slice(-8).map(id => 
        stations.find(s => s.station_id === id)
      ).filter((s): s is Station => s !== undefined)
    : [];
  
  return (
    <g>
      {/* Ghost trail */}
      {ghostTrail.map((station, idx) => (
        <circle
          key={`ghost-${entity.entity_id}-${idx}`}
          cx={station.x}
          cy={station.y}
          r={6}
          fill={entity.color}
          opacity={(idx + 1) / ghostTrail.length * 0.3}
        />
      ))}
      
      {/* Entity marker */}
      <g transform={`translate(${currentStation.x}, ${currentStation.y})`}>
        {/* Outer glow for critical */}
        {isCritical && (
          <circle
            r="20"
            fill="none"
            stroke="#ff4444"
            strokeWidth="3"
            className="animate-ping"
            opacity="0.5"
          />
        )}
        
        {/* Selection ring */}
        {isSelected && (
          <circle
            r="18"
            fill="none"
            stroke="#0088ff"
            strokeWidth="2"
          />
        )}
        
        {/* Entity circle */}
        <circle
          r="10"
          fill={entity.color}
          stroke={isCritical ? '#ff4444' : '#fff'}
          strokeWidth="2"
        />
        
        {/* Entity ID */}
        <text
          y="25"
          fontSize="8"
          textAnchor="middle"
          fill={entity.color}
          fontWeight="bold"
        >
          {entity.entity_id.replace('ENTITY_', 'E')}
        </text>
      </g>
    </g>
  );
};

export default MetroMap;
