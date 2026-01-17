/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Design Language v4.0 (ADL) - Complete
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "Operating System of Reality" - 현실의 운영체제
 * 
 * 핵심 원칙:
 * 1. LAPLACE OBSERVATION - 모든 것을 보되, 개입은 최소화
 * 2. SEMANTIC NEUTRALITY - 빨강/초록 대신 그라디언트 스펙트럼
 * 3. PROGRESSIVE DISCLOSURE - 처음엔 단순하게, 필요할 때 깊이
 * 4. PHYSICS-BASED MOTION - 모든 애니메이션은 물리 법칙 준수
 * 5. EDGE-FIRST PRIVACY - 개인정보는 로컬, 상수만 서버로
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. K-INDEX SPECTRUM (의미 중립)
// ═══════════════════════════════════════════════════════════════════════════════

export const kIndexSpectrum = {
  spectrum: [
    'hsl(270, 60%, 15%)',  // -1.0 (Deep Void)
    'hsl(260, 50%, 25%)',  // -0.7
    'hsl(250, 40%, 35%)',  // -0.5
    'hsl(240, 30%, 45%)',  // -0.3
    'hsl(220, 25%, 55%)',  // 0.0 (Neutral)
    'hsl(200, 35%, 55%)',  // +0.3
    'hsl(180, 45%, 50%)',  // +0.5
    'hsl(160, 55%, 45%)',  // +0.7
    'hsl(140, 65%, 40%)',  // +1.0 (Stellar)
  ],
  getColor: (k: number): string => {
    const index = Math.floor((k + 1) * 4);
    return kIndexSpectrum.spectrum[Math.max(0, Math.min(8, index))];
  },
  getClass: (k: number): string => {
    if (k <= -0.7) return 'text-purple-900';
    if (k <= -0.3) return 'text-purple-600';
    if (k <= 0.3) return 'text-slate-400';
    if (k <= 0.7) return 'text-cyan-500';
    return 'text-emerald-500';
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. I-INDEX SPECTRUM (궤도 강도)
// ═══════════════════════════════════════════════════════════════════════════════

export const iIndexSpectrum = {
  spectrum: [
    'hsl(0, 0%, 20%)',     // -1.0 (Collision)
    'hsl(280, 30%, 30%)',  // -0.5
    'hsl(260, 20%, 40%)',  // 0.0 (Parallel)
    'hsl(220, 40%, 50%)',  // +0.5
    'hsl(200, 60%, 60%)',  // +1.0 (Synergy)
  ],
  getColor: (i: number): string => {
    const index = Math.floor((i + 1) * 2);
    return iIndexSpectrum.spectrum[Math.max(0, Math.min(4, index))];
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. AUTUS COLORS
// ═══════════════════════════════════════════════════════════════════════════════

export const autusColors = {
  k: kIndexSpectrum,
  i: iIndexSpectrum,
  
  // 배경 (Imperial Glassmorphism)
  bg: {
    void: 'hsl(240, 20%, 5%)',
    nebula: 'hsl(260, 30%, 8%)',
    surface: 'hsl(250, 25%, 12%)',
    elevated: 'hsl(245, 22%, 16%)',
    glass: 'rgba(255, 255, 255, 0.03)',
  },
  
  // 텍스트
  text: {
    primary: 'hsl(220, 20%, 95%)',
    secondary: 'hsl(220, 15%, 70%)',
    tertiary: 'hsl(220, 10%, 50%)',
    muted: 'hsl(220, 5%, 35%)',
  },
  
  // 경고
  alert: {
    critical: 'hsl(350, 70%, 50%)',
    warning: 'hsl(40, 80%, 50%)',
    info: 'hsl(200, 60%, 50%)',
  },
  
  // 글로우 효과
  glow: {
    k: (k: number) => `0 0 ${20 + Math.abs(k) * 20}px ${kIndexSpectrum.getColor(k)}40`,
    i: (i: number) => `0 0 ${10 + i * 15}px hsl(200, 60%, 50%, 0.3)`,
    pulse: 'hsl(180, 100%, 50%)',
    cyan: 'rgba(34, 211, 238, 0.15)',
    purple: 'rgba(168, 85, 247, 0.15)',
  },
  
  // 엔티티 타입
  entityType: {
    INDIVIDUAL: { color: '#3b82f6', emoji: '👤' },
    STARTUP: { color: '#10b981', emoji: '🚀' },
    SMB: { color: '#8b5cf6', emoji: '🏢' },
    ENTERPRISE: { color: '#f59e0b', emoji: '🏛️' },
    CITY: { color: '#06b6d4', emoji: '🌆' },
    NATION: { color: '#ef4444', emoji: '🏴' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════════

export const autusTypography = {
  fonts: {
    display: '"SF Pro Display", "Inter", system-ui, sans-serif',
    body: '"SF Pro Text", "Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
    korean: '"Pretendard", "SUIT", sans-serif',
  },
  sizes: {
    hero: 'clamp(3rem, 8vw, 6rem)',
    h1: 'clamp(2rem, 5vw, 3.5rem)',
    h2: 'clamp(1.5rem, 3vw, 2.5rem)',
    h3: 'clamp(1.25rem, 2vw, 1.75rem)',
    body: 'clamp(0.875rem, 1.5vw, 1rem)',
    small: 'clamp(0.75rem, 1.2vw, 0.875rem)',
    micro: 'clamp(0.625rem, 1vw, 0.75rem)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SPACING & LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

export const autusSpacing = {
  unit: 8,
  scale: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128],
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  layers: {
    base: 0,
    elevated: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    toast: 50,
    tooltip: 60,
    max: 9999,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. MOTION SYSTEM (Physics-Based Springs)
// ═══════════════════════════════════════════════════════════════════════════════

export const autusMotion = {
  // 물리 기반 스프링
  spring: {
    default: { type: 'spring', stiffness: 300, damping: 30 },
    gentle: { type: 'spring', stiffness: 150, damping: 25 },
    bouncy: { type: 'spring', stiffness: 400, damping: 20 },
    snappy: { type: 'spring', stiffness: 500, damping: 35 },
    orbital: { type: 'spring', stiffness: 50, damping: 10, mass: 2 },
    heavy: { type: 'spring', stiffness: 100, damping: 20, mass: 3 },
    kChange: (delta: number) => ({
      type: 'spring',
      stiffness: 100 + Math.abs(delta) * 500,
      damping: 15 + Math.abs(delta) * 10,
    }),
  },
  
  // 이징
  easing: {
    default: [0.4, 0, 0.2, 1],
    enter: [0, 0, 0.2, 1],
    exit: [0.4, 0, 1, 1],
    emphasis: [0.4, 0, 0.6, 1],
  },
  
  // 지속 시간
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    glacial: 1000,
  },
  
  // 프리셋
  presets: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.98 },
    },
    orbital: {
      initial: { opacity: 0, scale: 0, rotate: -180 },
      animate: { opacity: 1, scale: 1, rotate: 0 },
      exit: { opacity: 0, scale: 0, rotate: 180 },
    },
    card: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.98, y: -10 },
    },
    staggerContainer: {
      animate: { transition: { staggerChildren: 0.05 } },
    },
    staggerItem: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
    },
    pulse: {
      animate: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        transition: { duration: 2, repeat: Infinity },
      },
    },
    breathe: {
      animate: {
        scale: [1, 1.03, 1],
        transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. COMPONENT PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

export const autusPrimitives = {
  // Glass Card
  glassCard: {
    base: `
      relative overflow-hidden
      bg-white/[0.03] backdrop-blur-xl backdrop-saturate-150
      border border-white/[0.08] rounded-2xl
      shadow-[0_8px_32px_rgba(0,0,0,0.12)]
    `,
    hover: `
      hover:bg-white/[0.05] hover:border-white/[0.12]
      hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)]
      transition-all duration-300
    `,
    gradient: `
      before:absolute before:inset-0 before:rounded-2xl
      before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent
      before:pointer-events-none
    `,
  },
  
  // Metric Display
  metricDisplay: {
    wrapper: 'flex flex-col items-center gap-1 font-mono tracking-tight',
    value: (k: number) => `text-4xl font-bold ${k >= 0 ? 'text-cyan-300' : 'text-purple-400'}`,
    delta: (dk: number) => `text-sm font-medium ${dk >= 0 ? 'text-emerald-400' : 'text-rose-400'}`,
    label: 'text-xs text-white/50 uppercase tracking-wider',
  },
  
  // Omni-Island
  omniIsland: {
    container: `
      fixed bottom-6 left-1/2 -translate-x-1/2
      flex items-center gap-3 px-4 py-3
      bg-black/90 backdrop-blur-2xl
      border border-white/10 rounded-full
      shadow-[0_8px_32px_rgba(0,0,0,0.4)]
      z-50
    `,
    item: `
      flex items-center justify-center
      w-12 h-12 rounded-full
      bg-white/5 hover:bg-white/10
      transition-all duration-200
    `,
    active: `
      bg-gradient-to-b from-cyan-500/20 to-cyan-500/5
      border border-cyan-500/30
      shadow-[0_0_20px_rgba(0,200,255,0.3)]
    `,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. AUTOMATION PHASES
// ═══════════════════════════════════════════════════════════════════════════════

export const automationPhases = {
  1: { name: 'Discovery', agent: 'The Scribe', emoji: '📜', color: 'from-blue-500 to-blue-600' },
  2: { name: 'Analysis', agent: 'The Demon', emoji: '🔮', color: 'from-purple-500 to-purple-600' },
  3: { name: 'Redesign', agent: 'The Architect', emoji: '📐', color: 'from-amber-500 to-amber-600' },
  4: { name: 'Optimize', agent: 'The Tuner', emoji: '🎛️', color: 'from-emerald-500 to-emerald-600' },
  5: { name: 'Eliminate', agent: 'The Reaper', emoji: '💀', color: 'from-rose-500 to-rose-600' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 9. DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityState {
  k: number;
  i: number;
  dk_dt: number;
  di_dt: number;
  omega: number;
  entityType: 'INDIVIDUAL' | 'STARTUP' | 'SMB' | 'ENTERPRISE' | 'CITY' | 'NATION';
  nodes: Node48[];
  slots: Slot144[];
}

export interface Node48 {
  id: string;
  domain: string;
  value: number;
  delta: number;
  label: string;
}

export interface Slot144 {
  id: string;
  type: string;
  source: string;
  target: string;
  strength: number;
  iScore: number;
  isEmpty?: boolean;
  targetPosition?: [number, number, number];
}

export interface Prediction {
  day: number;
  k: number;
  i: number;
  confidence: number;
}

export interface Task {
  id: string;
  name: string;
  phase: 1 | 2 | 3 | 4 | 5;
  status: 'observed' | 'analyzed' | 'suggested' | 'automated' | 'eliminated';
  automationScore: number;
  savings: number;
  frequency?: number;
  avgDuration?: number;
  category?: string;
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
}

export interface AIPData {
  id: string;
  attention: number;
  interest: number;
  priority: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatKValue(k: number): string {
  return (k >= 0 ? '+' : '') + k.toFixed(3);
}

export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(delta * 100).toFixed(1)}%/day`;
}

export function getKGlowColor(k: number): string {
  return k >= 0 
    ? `rgba(34, 211, 238, ${0.1 + k * 0.1})` 
    : `rgba(168, 85, 247, ${0.1 + Math.abs(k) * 0.1})`;
}

// Default export
export default {
  colors: autusColors,
  typography: autusTypography,
  spacing: autusSpacing,
  motion: autusMotion,
  primitives: autusPrimitives,
  phases: automationPhases,
  kSpectrum: kIndexSpectrum,
  iSpectrum: iIndexSpectrum,
};
