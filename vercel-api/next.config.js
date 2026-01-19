/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Edge Runtime 최적화
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
