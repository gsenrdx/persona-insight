/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // 성능 최적화: 이미지 최적화 활성화
    unoptimized: false,
    
    // 지원할 이미지 포맷 (WebP, AVIF 우선)
    formats: ['image/avif', 'image/webp'],
    
    // 반응형 이미지 크기 설정
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // 최소화할 품질 (기본값 75)
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일
    
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      {
        module: /node_modules\/.pnpm\/@supabase\+realtime-js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ]
    return config
  },
}

export default nextConfig
