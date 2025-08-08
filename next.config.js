const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const isAnalyze = process.env.BUNDLE_ANALYZE === 'true';

/**
 * Dynamically load plugins (like bundle analyzer).
 */
const getPlugins = () => {
  const plugins = [];

  if (isAnalyze) {
    plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'bundle-report.html',
      })
    );
  }

  return plugins;
};

const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  // ✅ Performance optimizations
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  // ✅ Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ✅ Output optimization
  output: 'standalone',
  
  // ✅ Bundle optimization
  modularizeImports: {
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },

  /**
   * Webpack configuration
   */
  webpack(config, { isServer }) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@lib': path.resolve(__dirname, 'lib'),
      '@components': path.resolve(__dirname, 'components'),
      '@pages': path.resolve(__dirname, 'pages'),
      '@styles': path.resolve(__dirname, 'styles'),
    };

    // ✅ Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            minChunks: 2,
            chunks: 'all',
            name: 'common',
            priority: 5,
          },
        },
      };
    }

    // ✅ Minimize chunk names in production
    if (process.env.NODE_ENV === 'production' && !isServer) {
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
    }

    config.plugins.push(...getPlugins());

    return config;
  },

  /**
   * Image Optimization
   */
  images: {
    domains: ['yourdomain.com', 'assets.vercel.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 640, 750, 1080, 1200, 1920],
    minimumCacheTTL: 60,
  },

  /**
   * Environment Variables
   */
  env: {
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_API_URL: process.env.OPENAI_API_URL,
    OPENAI_ORG: process.env.OPENAI_ORG,
    OPENAI_API_BASE: process.env.OPENAI_API_BASE,
    OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
    OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID,

    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_HOST: process.env.PINECONE_HOST,
    PINECONE_INDEX: process.env.PINECONE_INDEX,

    WIX_API_KEY: process.env.WIX_API_KEY,
    WIX_ACCOUNT_ID: process.env.WIX_ACCOUNT_ID,
    WIX_CLIENT_ID: process.env.WIX_CLIENT_ID,
    WIX_SITE_ID: process.env.WIX_SITE_ID,
    WIX_DATA_COLLECTION_ID: process.env.WIX_DATA_COLLECTION_ID,
  },

  /**
   * Redirect old routes
   */
  async redirects() {
    return [
      {
        source: '/old-url',
        destination: '/new-url',
        permanent: true,
      },
    ];
  },

  /**
   * Rewrite API endpoints if necessary
   */
  async rewrites() {
    return [
      {
        source: '/api/old-api',
        destination: '/api/new-api',
      },
    ];
  },

  /**
   * ✅ Security & Embedding Headers
   * Allows embedding in Wix iframe while keeping other headers secure
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Custom-Header', value: 'my-custom-value' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
