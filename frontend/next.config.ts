import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@pet/shared'],
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
    // В production используем относительные пути (backend на том же хосте)
    // В development используем localhost
    const mainApiUrl = process.env.NODE_ENV === 'production' 
      ? 'http://localhost:8000'  // В Docker контейнере Main Backend на localhost:8000
      : 'http://localhost:8000';
    
    const petbaseApiUrl = process.env.NODE_ENV === 'production'
      ? 'http://localhost:8100'  // В Docker контейнере PetBase на localhost:8100
      : 'http://localhost:8100';
    
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
