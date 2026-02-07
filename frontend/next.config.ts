import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Standalone output for Docker
  output: 'standalone',
  
  // Пустой turbopack config для совместимости с Next.js 16
  turbopack: {},
  
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // Rewrites для проксирования запросов
  async rewrites() {
    return [
      // Gateway endpoints (общий проксирование)
      {
        source: '/api/gateway/:path*',
        destination: 'https://api.zooplatforma.ru/api/:path*',
      },
    ];
  },
};

export default nextConfig;
