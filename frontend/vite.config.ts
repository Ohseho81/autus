import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// 압축 플러그인 (프로덕션 빌드 시 활성화)
let compressionPlugin: any = null;
if (process.env.NODE_ENV === 'production') {
  try {
    const viteCompression = require('vite-plugin-compression');
    compressionPlugin = [
      viteCompression.default({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
      viteCompression.default({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
    ];
  } catch (e) {
    console.warn('vite-plugin-compression not installed, skipping compression');
  }
}

// PWA 플러그인 (선택적)
let pwaPlugin: any = null;
try {
  const { VitePWA } = require('vite-plugin-pwa');
  pwaPlugin = VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
    manifest: {
      name: 'AUTUS - Money Physics Engine',
      short_name: 'AUTUS',
      description: '통합 비즈니스 자동화 플랫폼',
      theme_color: '#1a1a2e',
      background_color: '#0f0f23',
      display: 'standalone',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\./i,
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
        },
      ],
    },
  });
} catch (e) {
  // PWA 플러그인 설치 안됨
}

export default defineConfig({
  plugins: [
    react({
      // Fast Refresh 최적화
      fastRefresh: true,
    }),
    // Vendor Chunk 분리
    splitVendorChunkPlugin(),
    // PWA 지원
    pwaPlugin,
    // Bundle 분석 (--mode analyze)
    process.env.NODE_ENV === 'analyze' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
    // 압축 (프로덕션만)
    ...(compressionPlugin || []),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 번들 크기 경고 임계값 (KB)
    chunkSizeWarningLimit: 800,
    
    // 코드 스플리팅 설정
    rollupOptions: {
      // 단일 진입점 (최적화됨)
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          // React 코어
          'vendor-react': ['react', 'react-dom'],
          
          // Three.js (3D 렌더링)
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          
          // 후처리 효과
          'vendor-postprocessing': ['@react-three/postprocessing', 'postprocessing'],
          
          // 지도 라이브러리 (가장 큰 의존성)
          'vendor-map': ['mapbox-gl', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/react'],
          
          // 차트 라이브러리
          'vendor-charts': ['recharts'],
          
          // 유틸리티
          'vendor-utils': ['zustand', 'axios', 'framer-motion'],
          
          // 아이콘 (트리쉐이킹)
          'vendor-icons': ['lucide-react'],
        },
        // 분석 모드: npm run build -- --mode analyze
        ...(process.env.NODE_ENV === 'analyze'
          ? {
              manualChunks(id: string) {
                if (id.includes('node_modules')) {
                  return id.toString().split('node_modules/')[1].split('/')[0];
                }
              },
            }
          : {}),
      },
    },
    
    // 소스맵 비활성화 (프로덕션)
    sourcemap: false,
    
    // 최소화 설정 (esbuild가 더 빠름)
    minify: 'esbuild',
  },
  
  // 의존성 최적화
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'zustand', 'framer-motion', 'axios',
      'three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'
    ],
    exclude: ['@mapbox/node-pre-gyp'],
  },
  
  // 프리뷰 서버 설정
  preview: {
    port: 4173,
    strictPort: true,
  },
  
  // 환경 변수 접두사
  envPrefix: ['VITE_', 'AUTUS_'],
  
  // CSS 최적화
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
  },
  
  // esbuild 옵션
  esbuild: {
    // 프로덕션에서 console/debugger 제거
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // JSX 최적화
    jsx: 'automatic',
  },
  
});
