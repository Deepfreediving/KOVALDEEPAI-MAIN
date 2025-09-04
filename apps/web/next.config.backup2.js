/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Fix for the path resolution issue causing ERR_INVALID_ARG_TYPE
  webpack: (config, { isServer }) => {
    // Ensure all paths are properly resolved
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@lib': path.resolve(__dirname, 'lib'),
      '@utils': path.resolve(__dirname, 'utils'),
      '@components': path.resolve(__dirname, 'components'),
      '@pages': path.resolve(__dirname, 'pages'),
      '@styles': path.resolve(__dirname, 'styles'),
      '@src': path.resolve(__dirname, 'src'),
      '@types': path.resolve(__dirname, 'types'),
    }

    // Fix for potential undefined path issues
    const originalResolve = config.resolve.plugins || []
    config.resolve.plugins = originalResolve.filter(Boolean)

    // Ensure fallbacks are defined
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
    }

    return config
  },

  images: {
    unoptimized: true,
  },

  experimental: {
    esmExternals: false,
  },

  // Ensure proper asset handling
  assetPrefix: '',
  trailingSlash: false,

  // Development-specific fixes
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 25 * 1000,
      // number of pages that should be kept simultaneously without being disposed
      pagesBufferLength: 2,
    },
  }),
}

module.exports = nextConfig
