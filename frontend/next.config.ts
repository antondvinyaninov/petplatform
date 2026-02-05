import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zooplatforma.s3.firstvds.ru',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    // В production НЕ используем rewrites - фронтенд обращается напрямую к Gateway
    // В development используем rewrites для проксирования на localhost
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    
    const mainApiUrl = 'http://localhost:8000';
    const petbaseApiUrl = 'http://localhost:8100';
    
    return [
      // PetBase endpoints - должны быть ПЕРВЫМИ (более специфичные правила)
      {
        source: '/api/pets/:path*',
        destination: `${petbaseApiUrl}/api/pets/:path*`,
      },
      {
        source: '/api/media/:path*',
        destination: `${petbaseApiUrl}/api/media/:path*`,
      },
      {
        source: '/api/species/:path*',
        destination: `${petbaseApiUrl}/api/species/:path*`,
      },
      {
        source: '/api/breeds/:path*',
        destination: `${petbaseApiUrl}/api/breeds/:path*`,
      },
      {
        source: '/api/cards/:path*',
        destination: `${petbaseApiUrl}/api/cards/:path*`,
      },
      // Main Backend endpoints - все остальные (должны быть ПОСЛЕДНИМИ)
      {
        source: '/api/:path*',
        destination: `${mainApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
