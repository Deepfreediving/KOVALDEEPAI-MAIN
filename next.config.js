const path = require('path');
const webpack = require('webpack');

const isAnalyze = process.env.BUNDLE_ANALYZE === 'true';

const getPlugins = () => {
  const plugins = [];

  if (isAnalyze) {
    const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
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

module.exports = {
  reactStrictMode: true,

  webpack(config, { isServer }) {
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
    domains: ['yourdomain.com'], // 🔁 Replace with real domains as needed
    formats: ['image/webp'],
    deviceSizes: [640, 750, 1080, 1200, 1920],
  },

  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_API_BASE: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    PINECONE_HOST: process.env.PINECONE_HOST,
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
          {
            key: 'X-Custom-Header',
            value: 'my-custom-value',
          },
        ],
      },
    ];
  },
};
