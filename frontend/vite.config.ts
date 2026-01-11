import { defineConfig } from 'vite';
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

export default defineConfig({
  plugins: [
    react(),
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
    chunkSizeWarningLimit: 600,
    
    // 코드 스플리팅 설정
    rollupOptions: {
      output: {
        manualChunks: {
          // React 코어
          'vendor-react': ['react', 'react-dom'],
          
          // 지도 라이브러리 (가장 큰 의존성)
          'vendor-map': ['mapbox-gl', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/react'],
          
          // 차트 라이브러리
          'vendor-charts': ['recharts'],
          
          // 유틸리티
          'vendor-utils': ['zustand', 'axios'],
          
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
    include: ['react', 'react-dom', 'zustand'],
    exclude: ['@mapbox/node-pre-gyp'],
  },
});
