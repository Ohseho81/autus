/** @type {import('next').NextConfig} */
const nextConfig = {
  // API 프록시 설정
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL 
          ? `${process.env.API_URL}/api/:path*`
          : 'https://autus-production.up.railway.app/api/:path*',
      },
    ];
  },
  
  // 환경 변수
  env: {
    API_URL: process.env.API_URL || 'https://autus-production.up.railway.app',
  },
};

module.exports = nextConfig;
