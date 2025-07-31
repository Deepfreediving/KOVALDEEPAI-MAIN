const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const isAnalyze = process.env.BUNDLE_ANALYZE === 'true';

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

  // ✅ Recommended default; swcMinify is now always on in Next.js 15
  productionBrowserSourceMaps: false,

  webpack(config, { isServer }) {
    // Aliases for cleaner imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@lib': path.resolve(__dirname, 'lib'),
      '@components': path.resolve(__dirname, 'components'),
      '@pages': path.resolve(__dirname, 'pages'),
      '@styles': path.resolve(__dirname, 'styles'),
    };

    config.plugins.push(...getPlugins());

    return config;
  },

  images: {
    domains: ['yourdomain.com', 'assets.vercel.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 640, 750, 1080, 1200, 1920],
    minimumCacheTTL: 60, // Cache images for 1 minute on Vercel CDN
  },

  env: {
    // ✅ OpenAI
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_API_URL: process.env.OPENAI_API_URL,
    OPENAI_ORG: process.env.OPENAI_ORG,
    OPENAI_API_BASE: process.env.OPENAI_API_BASE,
    OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
    OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID,

    // ✅ Pinecone
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_HOST: process.env.PINECONE_HOST,
    PINECONE_INDEX: process.env.PINECONE_INDEX,

    // ✅ Wix API
    WIX_API_KEY: process.env.WIX_API_KEY,
    WIX_ACCOUNT_ID: process.env.WIX_ACCOUNT_ID,
    WIX_CLIENT_ID: process.env.WIX_CLIENT_ID,
  },

  async redirects() {
    return [
      {
        source: '/old-url',
        destination: '/new-url',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/old-api',
        destination: '/api/new-api',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Custom-Header', value: 'my-custom-value' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // ✅ Updated to use "compiler" instead of deprecated "experimental"
  compiler: {
    modularizeImports: {
      lodash: {
        transform: 'lodash/{{member}}',
      },
    },
  },
};

module.exports = nextConfig;
