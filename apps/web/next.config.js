/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
  webpack: (config, { isServer }) => {
    // Ensure all required paths are properly resolved
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Fix watchpack path resolution issues
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/.git/**', '**/node_modules/**', '**/.next/**', '**/dist/**'],
        poll: false,
      };
    }
    
    return config;
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_HOST: process.env.PINECONE_HOST,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
  },
};

module.exports = nextConfig;
