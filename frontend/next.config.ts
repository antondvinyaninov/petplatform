import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Генерируем уникальный Build ID для каждого билда
  // Это заставит браузеры загружать новые JS файлы вместо использования кеша
  generateBuildId: async () => {
    // Используем timestamp + random для гарантии уникальности
    return `build-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  },
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
    // В production используем rewrites для проксирования на Gateway
    // В development используем rewrites для проксирования на localhost
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/api/:path*',
          destination: 'https://api.zooplatforma.ru/api/:path*',
        },
      ];
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
