// ============================================
// KRATON DESIGN TOKENS
// "감각으로 느끼게 하되, 신뢰를 위해 진실을 선택적으로 드러낸다"
// ============================================

export const DESIGN_TOKENS = {
  // 색상
  colors: {
    background: '#030712',      // gray-950
    surface: 'rgba(17,24,39,0.6)', // gray-900/60
    glass: 'rgba(255,255,255,0.05)',
    
    // State 색상 (1-6)
    state: {
      1: { color: '#22c55e', label: 'OPTIMAL', bg: 'bg-emerald-500', text: 'text-emerald-400' },
      2: { color: '#3b82f6', label: 'STABLE', bg: 'bg-blue-500', text: 'text-blue-400' },
      3: { color: '#eab308', label: 'WATCH', bg: 'bg-yellow-500', text: 'text-yellow-400' },
      4: { color: '#f97316', label: 'ALERT', bg: 'bg-orange-500', text: 'text-orange-400' },
      5: { color: '#ef4444', label: 'RISK', bg: 'bg-red-500', text: 'text-red-400' },
      6: { color: '#b91c1c', label: 'CRITICAL', bg: 'bg-red-700', text: 'text-red-300' },
    },
    
    // 네온 색상
    neon: {
      cyan: '#06b6d4',
      purple: '#a855f7',
      pink: '#ec4899',
      gold: '#fbbf24',
      emerald: '#22c55e',
      blue: '#3b82f6',
    },
  },
  
  // 타이포그래피
  typography: {
    h1: 'text-3xl font-black tracking-tight',
    h2: 'text-xl font-bold tracking-tight',
    h3: 'text-lg font-semibold',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
    number: 'font-mono tabular-nums tracking-wide',
  },
  
  // 모션
  motion: {
    base: 'transition-all duration-300 ease-out',
    fast: 'transition-all duration-150 ease-out',
    slow: 'transition-all duration-500 ease-out',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
  },
  
  // 글래스모피즘
  glass: {
    card: 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl',
    button: 'bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl',
    surface: 'bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl',
  },
  
  // 그림자
  shadow: {
    neon: (color) => `0 0 20px ${color}40, 0 0 40px ${color}20`,
    glow: '0 0 30px rgba(59,130,246,0.3)',
    soft: '0 4px 20px rgba(0,0,0,0.3)',
  },
  
  // 간격
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  
  // 반응형 breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};

// 축약형 토큰
export const TOKENS = {
  type: DESIGN_TOKENS.typography,
  motion: DESIGN_TOKENS.motion,
  state: DESIGN_TOKENS.colors.state,
  glass: DESIGN_TOKENS.glass.card,
  neon: DESIGN_TOKENS.colors.neon,
};

export default DESIGN_TOKENS;
