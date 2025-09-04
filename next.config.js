/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['kovaldeepai-main.vercel.app'],
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kovaldeepai-main.vercel.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    forceSwcTransforms: true,
  },
  // Ensure static assets are properly handled
  assetPrefix: '',
  trailingSlash: false,
  // Disable SSG for problematic pages during development
  ...(process.env.NODE_ENV === 'development' && {
    output: 'standalone',
  }),
}

module.exports = nextConfig
