/** @type {import('next').NextConfig} */
const nextConfig = {
  // 서버 기능 비활성화 (Zero Server Storage)
  output: 'export',
  trailingSlash: true,
  
  // 이미지 최적화 비활성화 (정적 빌드용)
  images: {
    unoptimized: true,
  },

  // 번들 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 실험적 기능
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'd3'],
  },

  // 웹팩 최적화
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 청크 스플리팅
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          recharts: {
            test: /[\\/]node_modules[\\/](recharts|d3-.*|victory-vendor)[\\/]/,
            name: 'recharts',
            chunks: 'all',
            priority: 10,
          },
          d3: {
            test: /[\\/]node_modules[\\/]d3[\\/]/,
            name: 'd3',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
