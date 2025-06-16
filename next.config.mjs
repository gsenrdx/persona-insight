/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
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
