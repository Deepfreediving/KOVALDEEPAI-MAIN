/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    esmExternals: false,
  },
  // Minimal webpack config to avoid path issues
  webpack: (config) => {
    // Remove any undefined entries from resolve plugins
    if (config.resolve.plugins) {
      config.resolve.plugins = config.resolve.plugins.filter(plugin => plugin != null);
    }
    
    // Ensure fallback is defined
    config.resolve.fallback = config.resolve.fallback || {};
    
    return config;
  },
}

module.exports = nextConfig
