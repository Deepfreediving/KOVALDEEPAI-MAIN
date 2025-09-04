/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['kovaldeepai-main.vercel.app'],
    unoptimized: true, // Simplified for development
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kovaldeepai-main.vercel.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Remove experimental features that might cause issues
  experimental: {
    esmExternals: false,
  },
  // Add webpack config to handle potential path issues
  webpack: (config, { isServer }) => {
    // Ensure resolve fallback is properly set
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
      };
    }
    
    // Filter out any undefined plugins
    if (config.resolve.plugins) {
      config.resolve.plugins = config.resolve.plugins.filter(plugin => plugin != null);
    }
    
    return config;
  },
}

module.exports = nextConfig
