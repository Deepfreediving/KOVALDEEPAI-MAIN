// next.config.mjs

const nextConfig = {
  reactStrictMode: true, // Enables React's Strict Mode for development
  webpack(config, { isServer }) {
    if (isServer) {
      // Additional server-side webpack configurations, if necessary
    }
    return config;
  },

  images: {
    domains: ['example.com'],  // Replace with actual domains for image optimization
  },

  serverRuntimeConfig: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,  // Sensitive API keys
  },

  publicRuntimeConfig: {
    APP_NAME: process.env.APP_NAME || 'DefaultApp', // Public runtime variables
  },

  env: {
    CUSTOM_ENV_VAR: process.env.CUSTOM_ENV_VAR || 'default',  // Custom environment variables
  },
};

export default nextConfig;
