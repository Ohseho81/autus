/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./portal.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  // 다크모드 클래스 기반 (useTheme과 연동)
  darkMode: 'class',
  
  theme: {
    extend: {
      // AUTUS 색상 팔레트
      colors: {
        'autus': {
          bg: '#0a0a0f',
          panel: '#12121a',
          border: '#222',
          cyan: '#00ccff',
          gold: '#ffd700',
          red: '#ff6464',
          green: '#22c55e',
          purple: '#a855f7',
        },
      },
      
      // 반응형 컨테이너
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
      
      // 반응형 간격
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // 반응형 폰트 크기
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      
      // 최소/최대 너비
      minHeight: {
        'touch': '44px', // 터치 타겟 최소 크기
      },
      minWidth: {
        'touch': '44px',
      },
      
      // 애니메이션
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flow': 'flow 1s linear infinite',
        'fadeIn': 'fadeIn 0.2s ease-out',
        'fadeOut': 'fadeOut 0.2s ease-out',
        'scaleIn': 'scaleIn 0.2s ease-out',
        'scaleOut': 'scaleOut 0.15s ease-in',
        'slideInUp': 'slideInUp 0.3s ease-out',
        'slideInDown': 'slideInDown 0.3s ease-out',
        'slideInLeft': 'slideInLeft 0.3s ease-out',
        'slideInRight': 'slideInRight 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'indeterminate': 'indeterminate 1.5s infinite linear',
        'bounce-subtle': 'bounce-subtle 0.6s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 2px currentColor)' },
          '50%': { filter: 'drop-shadow(0 0 10px currentColor)' },
        },
        'flow': {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fadeOut': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scaleIn': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scaleOut': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        'slideInUp': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideInDown': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideInLeft': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slideInRight': {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(-10%)' },
          '50%': { transform: 'translateY(0)' },
        },
      },
      
      // 트랜지션
      transitionDuration: {
        '400': '400ms',
      },
      
      // 박스 섀도우
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 204, 255, 0.3)',
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.3)',
        'glow-red': '0 0 20px rgba(255, 100, 100, 0.3)',
        'inner-lg': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.1)',
      },
      
      // 백드롭 블러
      backdropBlur: {
        xs: '2px',
      },
      
      // 그리드
      gridTemplateColumns: {
        'auto-fill-sm': 'repeat(auto-fill, minmax(200px, 1fr))',
        'auto-fill-md': 'repeat(auto-fill, minmax(280px, 1fr))',
        'auto-fill-lg': 'repeat(auto-fill, minmax(360px, 1fr))',
      },
      
      // 타이포그래피
      fontFamily: {
        'sans': ['Inter', 'Pretendard', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  
  plugins: [
    // 커스텀 유틸리티 플러그인
    function({ addUtilities, addComponents, theme }) {
      // 반응형 터치 타겟 유틸리티
      addUtilities({
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
        },
        '.touch-target-sm': {
          '@media (min-width: 640px)': {
            'min-height': '36px',
            'min-width': '36px',
          },
        },
      });
      
      // 스크린 리더 전용 유틸리티
      addUtilities({
        '.sr-only-focusable': {
          '&:not(:focus):not(:focus-within)': {
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0',
          },
        },
      });
      
      // 스크롤바 숨김
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(100, 116, 139, 0.3)',
            'border-radius': '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(100, 116, 139, 0.5)',
          },
        },
      });
      
      // 글래스 효과
      addComponents({
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.05)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-dark': {
          'background': 'rgba(0, 0, 0, 0.3)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.05)',
        },
      });
    },
  ],
};
