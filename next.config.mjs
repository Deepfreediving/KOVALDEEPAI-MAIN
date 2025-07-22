import { fileURLToPath } from 'url';
import path from 'path';
import webpack from 'webpack';

// For conditional plugin usage
const isAnalyze = process.env.BUNDLE_ANALYZE === 'true';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically require only if analyzing
const getPlugins = () => {
  const plugins = [];
  if (isAnalyze) {
    const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
    plugins.push(new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }));
  }
  return plugins;
};

const nextConfig = {
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
    domains: ['yourdomain.com'], // Update to actual domains
    formats: ['image/webp'],
    deviceSizes: [640, 750, 1080, 1200, 1920],
  },

  env: {
    NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
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

export default nextConfig;
