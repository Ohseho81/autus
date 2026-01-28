// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 11개 뷰 컴포넌트 Export
// ═══════════════════════════════════════════════════════════════════════════════

export { CockpitView } from './CockpitView';
export { MapView } from './MapView';
export { WeatherView } from './WeatherView';
export { RadarView } from './RadarView';
export { ScoreboardView } from './ScoreboardView';
export { TideView } from './TideView';
export { HeartbeatView } from './HeartbeatView';
export { MicroscopeView } from './MicroscopeView';
export { NetworkView } from './NetworkView';
export { FunnelView } from './FunnelView';
export { CrystalView } from './CrystalView';

// View 타입
export type ViewId = 
  | 'cockpit' 
  | 'map' 
  | 'weather' 
  | 'radar' 
  | 'scoreboard' 
  | 'tide' 
  | 'heartbeat' 
  | 'microscope' 
  | 'network' 
  | 'funnel' 
  | 'crystal';

// View 메타데이터
export const VIEW_META: Record<ViewId, { icon: string; name: string; nameKo: string; question: string }> = {
  cockpit: { icon: '🎛️', name: 'Cockpit', nameKo: '조종석', question: '전체 상황은?' },
  map: { icon: '🗺️', name: 'Map', nameKo: '지도', question: '어디서 싸우나?' },
  weather: { icon: '🌤️', name: 'Weather', nameKo: '날씨', question: '언제 비 오나?' },
  radar: { icon: '📡', name: 'Radar', nameKo: '레이더', question: '뭐가 다가오나?' },
  scoreboard: { icon: '🏆', name: 'Scoreboard', nameKo: '스코어보드', question: '몇 대 몇인가?' },
  tide: { icon: '🌊', name: 'Tide', nameKo: '조류', question: '흐름이 어디로?' },
  heartbeat: { icon: '💓', name: 'Heartbeat', nameKo: '심전도', question: '심장이 정상인가?' },
  microscope: { icon: '🔬', name: 'Microscope', nameKo: '현미경', question: '자세히 보면?' },
  network: { icon: '🌐', name: 'Network', nameKo: '네트워크', question: '누가 누구와?' },
  funnel: { icon: '📊', name: 'Funnel', nameKo: '퍼널', question: '어디서 빠지나?' },
  crystal: { icon: '🔮', name: 'Crystal', nameKo: '수정구', question: '미래는 어떻게?' },
};
