/** @type {import('next').NextConfig} */
const nextConfig = {
  // 서버 기능 비활성화 (Zero Server Storage)
  output: 'export',
  trailingSlash: true,
  
  // 이미지 최적화 비활성화 (정적 빌드용)
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
