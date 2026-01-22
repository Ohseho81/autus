import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tesla FSD v2.0 색상 팔레트 (채도 -12%, 명도 +6%)
        'fsd-cyan': '#1ae8ff',
        'fsd-magenta': '#ff4db8',
        'fsd-yellow': '#ffd54a',
        'fsd-green': '#22e38a',
        'fsd-red': '#f25f5c',
        'fsd-purple': '#b366f0',
        'fsd-gray': '#5a6370',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.4s ease-in-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-2px)' },
          '80%': { transform: 'translateX(2px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
